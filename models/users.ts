import mongoose, { Schema, models, model } from "mongoose"

export interface IAddress {
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export interface IVendorInfo {
  storeName?: string
  isVerified?: boolean
}

export interface IUser {
  _id?: string

  name?: string
  email: string
  password: string
  role: "ADMIN" | "CUSTOMER"

  phone?: string
  avatar?: string
  address?: IAddress

  isActive: boolean

  // Only for ADMIN (vendor)
  vendorInfo?: IVendorInfo

  createdAt?: Date
  updatedAt?: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      select: false // 👈 important for security
    },
    role: {
      type: String,
      enum: ["ADMIN", "CUSTOMER"],
      default: "CUSTOMER"
    },
    phone: {
      type: String
    },
    avatar: {
      type: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    vendorInfo: {
      storeName: String,
      isVerified: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true
  }
)

// Prevent model overwrite error in Next.js hot reload
const User = models.User || model<IUser>("User", UserSchema)

export default User
