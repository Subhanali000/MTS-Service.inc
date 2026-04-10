// src/lib/auth.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import type { AuthOptions } from "next-auth"
import { randomBytes } from "node:crypto"
import { sendWelcomeEmail} from "app/api/mailing_server/mailer"
// ✅ Generate random password
function generateRandomPassword() {
  return randomBytes(8).toString("hex")
}


export const authOptions: AuthOptions = {
  providers: [
    // ✅ Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ✅ Credentials Login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        }
      }
    })
  ],

  callbacks: {
    // ✅ Google Login / Signup
   async signIn({ user, account }) {
  if (account?.provider === "google") {
    try {
      let existingUser = await prisma.user.findUnique({
        where: { email: user.email! },
      })

      if (!existingUser) {
        const rawPassword = generateRandomPassword()
        const hashedPassword = await bcrypt.hash(rawPassword, 10)

        existingUser = await prisma.user.create({
          data: {
            name: user.name,
            email: user.email!,
            avatar: user.image,
            role: "CUSTOMER",
            password: hashedPassword,
          },
        })

        
        await sendWelcomeEmail(
  user.email!,
  rawPassword,
  user.name || "User"
)
      }

      // ✅ attach values
      user.id = existingUser.id
      user.role = existingUser.role
      user.avatar = existingUser.avatar

      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  return true
},

    // ✅ JWT (NO DB CALL → FAST)
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = (user as any).role || "CUSTOMER"
        token.avatar = (user as any).avatar || user.image || null
      }
      return token
    },

   async session({ session, token }) {
  // ❌ DO NOT return null — always return session

  if (!token?.sub) {
    return session
  }

  // 🔐 Verify user still exists
  const dbUser = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { id: true, role: true, avatar: true },
  })

  // ❌ If user deleted → clear session safely
  if (!dbUser) {
    // Remove sensitive data instead of returning null
    session.user = {
      id: "",
      role: "CUSTOMER",
      avatar: null,
      name: null,
      email: null,
      image: null,
    }
    return session
  }

  // ✅ Normal case
  session.user = {
    ...session.user,
    id: dbUser.id,
    role: dbUser.role,
    avatar: dbUser.avatar,
  }

  return session
},

   async redirect({ url, baseUrl }) {
  // ✅ If relative URL (like /dashboard)
  if (url.startsWith("/")) {
    return `${baseUrl}${url}`
  }

  // ✅ If same origin
  if (new URL(url).origin === baseUrl) {
    return url
  }

  // ❌ fallback
  return baseUrl
}
  },

  pages: {
    signIn: "/login",
    error: "/login", // 🔥 redirect errors to login
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // ✅ 1 day session
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

export const handler = NextAuth(authOptions)