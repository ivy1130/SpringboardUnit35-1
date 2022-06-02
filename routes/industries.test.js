// connect to right DB --- set before loading db.js
process.env.NODE_ENV = "test";

// npm packages
const request = require("supertest");

// app imports
const app = require("../app");
const db = require("../db");

let testCompany
let testIndustry

beforeEach(async function() {
  let companyResult = await db.query(`
    INSERT INTO
      companies (code, name, description)
      VALUES ('test', 'test company', 'just a silly lil test company')
      RETURNING code, name, description`);
  testCompany = companyResult.rows[0];

  let industryResult = await db.query(`
    INSERT INTO
      industries (code, industry)
      VALUES ('testind', 'test industry')
      RETURNING code, industry`);
  testIndustry = industryResult.rows[0]
});


/** GET /industries - returns `{industries: [industry, ...]}` */

describe("GET /industries", function() {
  test("Gets a list of 1 industry", async function() {
    const response = await request(app).get(`/industries`);
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      industries: [{code: testIndustry.code, industry: testIndustry.industry, company_codes:[]}]
    });
  });
});
// end


/** POST /industries - create industry from data; return `{industry: industry}` */

describe("POST /industries", function() {
  test("Creates a new industry", async function() {
    const response = await request(app)
      .post(`/industries`)
      .send({
        code: "anothertestind",
        industry: "second test industry"
      });
    expect(response.statusCode).toEqual(201);
    expect(response.body).toEqual({
      industry: {code: "anothertestind", industry: "second test industry"}
    });
  });
});
// end


/** POST /industries/[code] - associate an industry to a company; return `{association: association}` */

describe("POST /industries/:code", function() {
  test("Creates an association between industry and company", async function() {
    const response = await request(app)
      .post(`/industries/${testIndustry.code}`)
      .send({
        company_code: testCompany.code
      });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      association: {company_code: testCompany.code, industry_code: testIndustry.code}
    });
  });

  test("Responds with 404 if can't find industry", async function() {
    const response = await request(app).put(`/industries/0`);
    expect(response.statusCode).toEqual(404);
  });
});
// end


afterEach(async function() {
  // delete any data created by test
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM industries");
});

afterAll(async function() {
  // close db connection
  await db.end();
});
