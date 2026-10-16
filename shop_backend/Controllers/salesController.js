import User from '../Models/userModel.js';
import Sale from '../Models/salesModal.js';
import Product from '../Models/productModal.js';

export const getSalesController = async (req, res) => {
    try {
        // get user
        const user = await User.findOne({ _id:req.user.userId }).populate("sales");
        if (!user) {
            return res.status(404).json({ status:false, message: "Unauthorized user" });
        }
        // console.log("sales list:",user.sales);
        return res.status(200).json({ status:true, data: user.sales });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status:false,message: 'Failed getting sales data' });
    }
};
export const createNewSaleController = async (req, res) => {
    try {
        const { cust_name, cust_email, cust_contact, cartItems } = req.body;

        if (!cust_name?.trim() || !cust_email?.trim() || !cust_contact?.trim()) {
            return res.status(400).json({
                status: false,
                message: "Customer name, email, and contact are required",
            });
        }

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({
                status: false,
                message: "At least one cart item is required",
            });
        }

        // get user
        const user = await User.findOne({ _id:req.user.userId });
        if (!user) {
            return res.status(404).json({ status:false, message: "Unauthorized user" });
        }

        const normalizedCartItems = cartItems.map((item) => ({
            ...item,
            c_quantity: Number(item.c_quantity),
            c_unit_price: Number(item.c_unit_price),
            c_discount: Number(item.c_discount),
            c_subtotal: Number(item.c_subtotal),
        }));

        if (
            normalizedCartItems.some(
                (item) =>
                    !item.c_id ||
                    !item.c_name?.trim() ||
                    !Number.isFinite(item.c_quantity) ||
                    item.c_quantity <= 0
            )
        ) {
            return res.status(400).json({
                status: false,
                message: "Invalid cart items provided",
            });
        }

        const productIds = normalizedCartItems.map((item) => item.c_id);
        const products = await Product.find({
            _id: { $in: productIds },
            userId: req.user.userId,
        });

        if (products.length !== normalizedCartItems.length) {
            return res.status(404).json({
                status: false,
                message: "One or more selected products were not found",
            });
        }

        const productMap = new Map(
            products.map((product) => [String(product._id), product])
        );

        for (const item of normalizedCartItems) {
            const product = productMap.get(String(item.c_id));

            if (!product) {
                return res.status(404).json({
                    status: false,
                    message: `Product not found for item ${item.c_name}`,
                });
            }

            if (product.p_stock < item.c_quantity) {
                return res.status(400).json({
                    status: false,
                    message: `${product.p_name} only has ${product.p_stock} unit(s) left`,
                });
            }
        }

        // add sales id to user's sales list
        const sale = await Sale.create({
            cust_name: cust_name.trim(),
            cust_email: cust_email.trim().toLowerCase(),
            cust_contact: cust_contact.trim(),
            cartItems: normalizedCartItems,
            userId: req.user.userId,
        });
        user.sales.push(sale._id);
        await user.save();

        // update product stock for each cart items:
        for (const item of normalizedCartItems) {
            const product = productMap.get(String(item.c_id));
            product.p_stock -= item.c_quantity;
            await product.save();
        }

        return res.status(201).json({ status:true, message: "Sales created" })
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({
                status: false,
                message: "Duplicate sales data is not allowed",
            });
        }
        res.status(500).json({ status:false,message: 'Failed to create sales' });
    }
};

export const deleteSaleController = async (req, res) => {
    try {
        const { salesId } = req.body;
        // get user
        const user = await User.findOne({ _id:req.user.userId });
        if (!user) {
            return res.status(404).json({ status:false, message: "Unauthorized user" });
        }
        await Sale.deleteOne({ "_id": salesId });
        // delete sale froom user sales array as well:
        user.sales = user.sales.filter((id) => id.toString() !== salesId);
        await user.save();

        return res.status(200).json({ status:true, message: "Sales deleted" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ status:false,message: 'Failed to delete sales' });
    }
};
