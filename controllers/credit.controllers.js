import Stripe from "stripe"
import db from "../config/db.config.js";


const plans = [
    {
        id: "basic",
        name: "Basic",
        price: 10,
        credit: 100,
        features: ['100 text generations', '50 image generations', 'Standard support', 'Access to basic models']
    },
    {
        id: "pro",
        name: "Pro",
        price: 20,
        credit: 500,
        features: ['500 text generations', '200 image generations', 'Priority support', 'Access to pro models', 'Faster response time']
    },
    {
        id: "premium",
        name: "Premium",
        price: 30,
        credit: 1000,
        features: ['1000 text generations', '500 image generations', '24/7 VIP support', 'Access to premium models', 'Dedicated account manager']
    }
];

async function getPlans(req,res) {
    try {
        res.json({success:true,plans})
    } catch (error) {
        res.json({success:false,message:error.message})
    }
};


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function purchasePlan(req,res) {
    try {
        const { planId, isPaid = false } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!planId) {
            return res.status(400).json({ success: false, message: "planId is required" });
        }

        const plan = plans.find(plan => plan.id === planId);

        if(!plan){
            return res.json({success:false , message:"Invalid Plan"})
        }

        const amount = plan.price;
        const credit = plan.credit;
        const paidFlag = isPaid ? 1 : 0;

        const [result] = await db.query(
            `INSERT INTO transactions (userId, planId, amount, credit, isPaid) VALUES (?,?,?,?,?)`,
            [userId, planId, amount, credit, paidFlag],
        );

        const {origin} = req.headers;

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency:'usd',
                        unit_amount:plan.price * 100,
                        product_data:{
                            name:plan.name
                        }
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/loading`,
            cancel_url:`${origin}`,
            metadata:{transactionId : result.insertId.toString(),appId:"quickgpt"},
            expires_at:Math.floor(Date.now()/1000) +30 * 60
          });

        return res.status(201).json({
            success: true,
            url:session.url,
            transactionId: result.insertId,
            transaction: { userId, planId, amount, credit, isPaid: !!isPaid },
        });
    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
};

export{getPlans,purchasePlan};