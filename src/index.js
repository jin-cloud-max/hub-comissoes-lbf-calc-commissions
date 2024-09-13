import { MongoClient } from "mongodb";
import { Commission } from "./commission.js";

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING)

const BATCH_SIZE = 1000

export const handler = async (event) => {
   const record = event.Records[0];

   const body = JSON.parse(record.body);

   const user = body.user
   const rule = body.rule
   const tax = body.tax

   const calcCommission = new Commission({
      rule,
      user,
      tax: Number(tax)
   })

   const collection = client.db('commissions').collection('commission')
   const userCommission = client.db('commissions').collection('user_commission')

   try {
      // TODO: Add closure id
      const mongoFilter = {
         col_code: user.code,
         found_category: true,
         processed: false
      }

      const commissions = await collection.find(mongoFilter).toArray()

      if (commissions.length < 1) {
         return {
            statusCode: 200,
            body: JSON.stringify({ message: 'No commissions available' })
         }
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

      const response = {
         statusCode: 200,
         body: JSON.stringify('Hello from Lambda!'),
      };
      return response;
   } catch (error) {
      console.log(error)

      throw new Error(error)
   }
};
