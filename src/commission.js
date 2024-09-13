export class Commission {
   rule
   orgId
   tax

   /**
    * Receives the user rule
    * @param {*} input 
    */
   constructor(input) {
      this.rule = input.rule
      this.orgId = input.user.orgId
      this.tax = input.tax
   }

   /**
    * Get category fee and return parsing to number if it is string
    */
   getCategoryFee(category) {
      const fee = this.rule.categories.find(val => val.slug === `${this.orgId}#${this.slugifyString(category)}`).fee

      return Number(fee)
   }

   /**
    * Get office fee and net
    * @param {Object} input
    * @param {Number} input.amount
    * @param {Number} input.fee 
    */
   getOrgShare(input) {
      const grossIncome = (input.fee / 100) * input.amount

      const tax = (this.tax / 100) * grossIncome

      const net = grossIncome - tax

      return {
         grossIncome,
         fee: input.fee,
         net,
         tax
      }
   }


   /** 
   * @param {Object} input
   * @param {object} input._id
   * @param {string} input._id.$oid
   * @param {string} input.org_id
   * @param {boolean} input.found_category
   * @param {string} input.upload_id
   * @param {boolean} input.processed
   * @param {string} input.category
   * @param {string} input.product
   * @param {string} input.client
   * @param {string} input.gross_income
   * @param {string} input.net_revenue
   * @param {string} input.org_commission_percent
   * @param {string} input.org_commission
   * @param {string} input.col_code
   * @param {string} input.org_net_commission
   */
   calculate(input) {
      let amount = Number(input.org_net_commission)

      const fee = this.getCategoryFee(input.category)

      if (!fee) {
         return {
            success: false,
            message: `Regra não possui percentual para categoria: ${input.category}`,
            data: null
         }
      }

      const grossIncome = (fee / 100) * amount

      const taxAmount = (this.tax / 100) * grossIncome

      const net = grossIncome - taxAmount

      const orgCommission = this.getOrgShare({ fee: 100 - fee, amount })

      return {
         category: input.category,
         client: input.client,
         closure: new Date(),
         commission_id: input._id,
         gross_income: Number(grossIncome),
         fee,
         net: Number(net),
         org_gross_income: orgCommission.grossIncome,
         org_fee: orgCommission.fee,
         org_net: orgCommission.net,
         org_received_amount: input.org_net_commission,
         product: input.product,
         tax: this.tax,
         source: 'XP Investimentos',
      }
   }

   /**
    * Example: "Fundos de Investimentos" => "fundos-de-investimentos"
    */
   slugifyString(text) {
      return text
         .normalize('NFKD')
         .toLowerCase()
         .trim()
         .replace(/\s+/g, '-')
         .replace(/[^\w-]+/g, '')
         .replace(/_/g, '-')
         .replace(/--+/g, '-')
         .replace(/-$/g, '-')
   }
}