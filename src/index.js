import { MongoClient } from "mongodb";
import { Commission } from "./commission.js";

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING)

const BATCH_SIZE = 1000

export const handler = async (event) => {
   const record = event.Records[0];

   const body = JSON.parse(record.body);

   const user = body.data.user
   const rules = body.data.user.rules
   const tax = body.data.tax
   const orgId = body.orgId
   const closureId = body.data.closure

   const collection = client.db(process.env.MONGO_DATABASE).collection('commission')
   const userCommission = client.db(process.env.MONGO_DATABASE).collection('user_commission')
   const ruleCollection = client.db(process.env.MONGO_DATABASE).collection('rule')

   try {
      for await (const item of rules) {
         const rule = await ruleCollection.findOne({ rule_id: item.id })

         if (!rule) {
            throw new Error('Rule not found on ')
         }

         const calcCommission = new Commission({
            rule,
            user,
            tax: Number(tax),
            orgId
         })

         const mongoFilter = {
            col_code: user.code,
            success: true,
            'closure.id': closureId,
            processed: false
         }

         const commissions = await collection.find(mongoFilter).toArray()

         if (commissions.length < 1) {
            console.log('No commissions pending')

            break
         }

         let batch = []

         for await (const data of commissions) {
            const commission = calcCommission.calculate(data)

            batch.push(commission)

            if (batch >= BATCH_SIZE) {
               await userCommission.insertMany(batch)

               batch = []
            }

         }

         if (batch.length > 0) {
            await userCommission.insertMany(batch)

            batch = []
         }

         await collection.updateMany(mongoFilter, {
            $set: {
               processed: true
            }
         })
      }


      console.log(`Comissão calculada para o usuário: ${JSON.stringify(user)}`)
   } catch (error) {
      console.log(error)

      throw new Error(error)
   }
};
