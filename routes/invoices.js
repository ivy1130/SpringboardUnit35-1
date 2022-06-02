/** Routes about invoices. */

const express = require("express");
const router = new express.Router();
const db = require("../db")
const ExpressError = require("../expressError")

/** GET / - returns `{invoices: [invoice, ...]}` */

router.get("/", async function(req, res, next) {
    try {
      const invoicesQuery = await db.query("SELECT id, comp_code FROM invoices")
      return res.json({ invoices: invoicesQuery.rows});
    } catch(err){
      return next(err)
    }
  })
  
  
  /** GET /[id] - return data about one invoice: `{invoice: invoice}` */
  
  router.get("/:id", async function(req, res, next) {
    try {
      const invoiceQuery = await db.query(
        `SELECT id, amt, paid, add_date, paid_date, c.code, c.name, c.description 
            FROM invoices
            INNER JOIN companies c
            ON invoices.comp_code=c.code
            WHERE id = $1`, [req.params.id])
  
      if (invoiceQuery.rows.length === 0) {
        let notFoundError = new Error(`There is no invoice with corresponding id '${req.params.id}`)
        notFoundError.status = 404
        throw notFoundError
      }
      const data = invoiceQuery.rows[0]
      const invoice = {
        id: data.id,
        company: {
          code: data.comp_code,
          name: data.name,
          description: data.description,
        },
        amt: data.amt,
        paid: data.paid,
        add_date: data.add_date,
        paid_date: data.paid_date,
      }
      return res.json({ invoice: invoice})
    } catch (err) {
      return next(err)
    }
  })
  
  
  /** POST / - create invoice from data; return `{invoice: invoice}` */
  
  router.post("/", async function(req, res, next) {
    try {
      const result = await db.query(
        `INSERT INTO invoices (comp_code, amt) 
           VALUES ($1, $2) 
           RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        [req.body.comp_code, req.body.amt])
  
      return res.status(201).json({invoice: result.rows[0]})  // 201 CREATED
    } catch (err) {
      return next(err)
    }
  })
  
  
  /** PUT /[id] - update fields in invoice; return `{invoice: invoice}` */
  
  router.put("/:id", async function(req, res, next) {
    try {
      if ("comp_code" in req.body) {
        throw new ExpressError("Not allowed", 400)
      }
  
      const result = await db.query(
        `UPDATE invoices 
             SET amt=$1
             WHERE id=$2
             RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        [req.body.amt, req.params.id])
  
      if (result.rows.length === 0) {
        throw new ExpressError(`There is no invoice with corresponding id of '${req.params.id}`, 404)
      }
  
      return res.json({ invoice: result.rows[0]})
    } catch (err) {
      return next(err)
    }
  })
  
  
  /** DELETE /[id] - delete invoice, return `{message: "Invoice deleted"}` */
  
  router.delete("/:id", async function(req, res, next) {
    try {
      const result = await db.query(
        "DELETE FROM invoices WHERE id=$1 RETURNING id", [req.params.id])
  
      if (result.rows.length === 0) {
        throw new ExpressError(`There is no invoice with corresponding id of '${req.params.id}`, 404)
      }
      return res.json({ status: "deleted" })
    } catch (err) {
      return next(err)
    }
  })


module.exports = router