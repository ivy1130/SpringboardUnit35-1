/** Routes about industries. */

const express = require("express");
const router = new express.Router();
const db = require("../db")
const ExpressError = require("../expressError")
const slugify = require("slugify")

/** GET / - returns `{industries: [industry, ...]}` */

router.get("/", async function(req, res, next) {
    try {
      const industriesQuery = await db.query(`
      SELECT i.code, i.industry, ci.company_code
      FROM industries i
      LEFT JOIN companies_industries ci
      ON i.code=ci.industry_code`)

      let industriesResult = []

      for (let row of industriesQuery.rows) {

        if (!industriesResult.find(key => key.code === `${row.code}`)) {
          row['company_codes'] = [row['company_code']]
          delete row['company_code']
          industriesResult.push(row)
        }
        else {
          let indIdx = industriesResult.findIndex(key => key.code === `${row.code}`)
          industriesResult[indIdx]['company_codes'].push(row['company_code'])
        }
      }
        
      return res.json({ industries: industriesResult});
    } catch(err){
      return next(err)
    }
  })
  
  
  /** POST / - create industry from data; return `{industry: industry}` */
  
  router.post("/", async function(req, res, next) {
    try {
      const result = await db.query(
        `INSERT INTO industries (code, industry) 
          VALUES ($1, $2) 
          RETURNING code, industry`,
        [slugify(req.body.code), req.body.industry])
  
      return res.status(201).json({industry: result.rows[0]})  // 201 CREATED
    } catch (err) {
      return next(err)
    }
  })
  
  
  /** POST /[code] - associate an industry to a company; return `{association: association}` */
  
  router.post("/:code", async function(req, res, next) {
    try {
      if ("code" in req.body) {
        throw new ExpressError("Not allowed", 400)
      }
      else if (!req.body.company_code) {
        throw new ExpressError("Company code is required to make an association", 400)
      }
  
      const result = await db.query(
        `INSERT INTO companies_industries (company_code, industry_code)
          VALUES ($1, $2)
          RETURNING company_code, industry_code`,
        [req.body.company_code, req.params.code])
  
      if (result.rows.length === 0) {
        throw new ExpressError(`There is no industry with corresponding code of '${req.params.code}`, 404)
      }
  
      return res.json({ association: result.rows[0]})
    } catch (err) {
      return next(err)
    }
  })


module.exports = router
