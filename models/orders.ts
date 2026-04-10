import mongoose, { Schema, models, model } from "mongoose"

export interface IOrderItem {
  product: mongoose.Types.ObjectId
  price: number
  quantity: number
}

export interface IOrder {
  _id?: string

  user: mongoose.Types.ObjectId
  items: IOrderItem[]

  totalAmount: number

  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED"

  createdAt?: Date
  updatedAt?: Date
}

const OrderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        }
      }
    ],
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING"
    }
  },
  {
    timestamps: true
  }
)

const Order = models.Order || model<IOrder>("Order", OrderSchema)

export default Order
