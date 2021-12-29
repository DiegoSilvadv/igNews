import { NextApiRequest, NextApiResponse } from "next";
import { query as q } from 'faunadb'
import {getSession} from 'next-auth/client'
import { fauna } from "../../services/fauna";
import {stripe} from '../../services/stripe';

type User = {
    ref: {
        id: string;
    }
    data: {
        stripe_customer_id: string;
    }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default async (req: NextApiRequest, res: NextApiResponse) => {

    if(req.method === 'POST') {

        //pegando informacoes do usuario com getsession
        const session = await getSession({ req })

        //verificando se já existe um usuario no fauna que contenha o registro no fauna 
        const user = await fauna.query<User>(
            q.Get(
                q.Match(
                    q.Index('user_by_email'),
                    q.Casefold(session.user.email)
                )
            )
        )

        let customerId = user.data.stripe_customer_id
        
        //caso o usuario da consulta não tenha a id do stripe cadastrada sera cadastrado ao novo usuario
        if(!customerId) {
            const stripeCustomer = await stripe.customers.create({
                email: session.user.email,
            })

            await fauna.query(
                q.Update(
                    q.Ref(q.Collection('users'), user.ref.id),
                    {
                        data: {
                            stripe_customer_id: stripeCustomer.id
                        }
                    }
                )
            )
            
            customerId = stripeCustomer.id
        }

        const stripeCheckoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            line_items: [
                {price: 'price_1JmSaoK5I4rWWv0bamDcsMHJ', quantity: 1}
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: process.env.STRIPE_SUCCESS_URL,
            cancel_url: process.env.STRIPE_CANCEL_URL,

        })

        return res.status(200).json({ sessionId: stripeCheckoutSession.id })

    } else {
        res.setHeader('Allow', 'POST')
        res.status(405).end('Method not allowed')
    }
    
}