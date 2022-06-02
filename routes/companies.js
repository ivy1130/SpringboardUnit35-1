/** Routes about companies. */

const express = require("express");
const router = new express.Router();
const db = require("../db")
const ExpressError = require("../expressError")
const slugify = require("slugify")

/** GET / - returns `{companies: [company, ...]}` */

router.get("/", async function(req, res, next) {
    try {
      const companiesQuery = await db.query("SELECT code, name FROM companies")
      return res.json({ companies: companiesQuery.rows});
    } catch(err){
      return next(err)
    }
  })
  
  
/** GET /[code] - return data about one company: `{company: company}` */
  
router.get("/:code", async function(req, res, next) {
  try {
    const companyQuery = await db.query(
      `SELECT c.code, c.name, c.description, i.industry
      FROM companies c
      LEFT JOIN companies_industries ci
      ON c.code=ci.company_code
      LEFT JOIN industries i
      on ci.industry_code=i.code
      WHERE c.code = $1`, [req.params.code])

    const invoicesQuery = await db.query(
      `SELECT id FROM invoices WHERE comp_code = $1`,[req.params.code])

    if (companyQuery.rows.length === 0) {
      let notFoundError = new Error(`There is no company with corresponding code '${req.params.code}`)
      notFoundError.status = 404
      throw notFoundError
    }

    const {code, name, description} = companyQuery.rows[0]
    let industries = companyQuery.rows.map(r => r.industry)

    if (industries[0] === null) {
      industries = []
    }
    
    const company = {code, name, description, industries}

    const invoices = invoicesQuery.rows
    company.invoices = invoices.map(inv => inv.id)

    return res.json({ company: company })
  } catch (err) {
    return next(err)
  }
})
  
  
/** POST / - create company from data; return `{company: company}` */

router.post("/", async function(req, res, next) {
  try {
    const result = await db.query(
      `INSERT INTO companies (code, name, description) 
        VALUES ($1, $2, $3) 
        RETURNING code, name, description`,
      [slugify(req.body.name, {lower: true}), req.body.name, req.body.description])

    return res.status(201).json({company: result.rows[0]})  // 201 CREATED
  } catch (err) {
    return next(err)
  }
})


/** PUT /[code] - update fields in company; return `{company: company}` */

router.put("/:code", async function(req, res, next) {
  try {
    if ("code" in req.body) {
      throw new ExpressError("Not allowed", 400)
    }

    const result = await db.query(
      `UPDATE companies 
        SET name=$1,
            description=$2
        WHERE code = $3
        RETURNING code, name, description`,
      [req.body.name, req.body.description, req.params.code])

    if (result.rows.length === 0) {
      throw new ExpressError(`There is no company with corresponding code of '${req.params.code}`, 404)
    }

    return res.json({ company: result.rows[0]})
  } catch (err) {
    return next(err)
  }
})


/** DELETE /[code] - delete company, return `{message: "Company deleted"}` */

router.delete("/:code", async function(req, res, next) {
  try {
    const result = await db.query(
      "DELETE FROM companies WHERE code = $1 RETURNING code", [req.params.code])

    if (result.rows.length === 0) {
      throw new ExpressError(`There is no company with corresponding code of '${req.params.code}`, 404)
    }
    return res.json({ status: "deleted" })
  } catch (err) {
    return next(err)
  }
})


module.exports = router
