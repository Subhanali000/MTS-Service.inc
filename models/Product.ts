import mongoose, { Schema, model, models } from "mongoose"

export interface IProduct {
  _id?: string

  title: string
  description?: string

  price: number
  stock: number

  images: string[] // image URLs
  category?: string

  vendor: mongoose.Types.ObjectId // ADMIN user

  isActive: boolean

  createdAt?: Date
  updatedAt?: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0
    },
    images: {
      type: [String],
      default: []
    },
    category: {
      type: String,
      index: true
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

// Prevent model overwrite error in Next.js
const Product = models.Product || model<IProduct>("Product", ProductSchema)

export default Product
