import mongoose, { Schema, models, model } from "mongoose"

export interface ICartItem {
  product: mongoose.Types.ObjectId
  quantity: number
}

export interface ICart {
  _id?: string
  user: mongoose.Types.ObjectId
  items: ICartItem[]
  updatedAt?: Date
}

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        }
      }
    ]
  },
  {
    timestamps: true
  }
)

const Cart = models.Cart || model<ICart>("Cart", CartSchema)

export default Cart
