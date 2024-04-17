import chai from "chai"
import request from "supertest"
import app from "../../app"
import { expect } from "chai"
import { describe, it } from "mocha"
// import logger from "../../helpers/logger"

const urlBase = "/api/v1"

let testUserId: string = "cc2c990b6-029c-11ed-b939-0242ac120002"

describe("Functional Tests API", () => {
  describe("route > user > POST", () => {
    it("should add a new user", async () => {
      try {
        const response = await request(app)
          .post(`${urlBase}/user`)
          .send({
            userId: testUserId,
            firstname: "test_Rosita",
            lastname: "test_Espinosa",
          })
          .set("Accept", "application/json")
          .expect("Content-Type", /json/)

        expect(response.status).to.be.within(200, 299)
        expect(response.body).to.not.be.empty
        expect(response.body.userId).to.equal(testUserId)
      } catch (error) {
        chai.assert.fail("unexpected error found in route route > user > POST")
      }
    })
  })

  describe("route > user > GET (all users)", () => {
    it("should return an array of all users", async () => {
      try {
        const response = await request(app).get(`${urlBase}/user`).set("Accept", "application/json").expect("Content-Type", /json/)

        expect(response.status).to.be.within(200, 299)
        expect(response.body).to.be.an("array")

        if (response.body.length > 0) {
          expect(response.body[0]).to.have.property("userId")
        }
      } catch (error) {
        chai.assert.fail("unexpected error found in route route > user > GET (all users)")
      }
    })
  })

  describe("route > user > GET (single user)", () => {
    it("should return a single user", async () => {
      try {
        const response = await request(app).get(`${urlBase}/user/${testUserId}`).set("Accept", "application/json").expect("Content-Type", /json/)

        expect(response.status).to.be.within(200, 299)
        expect(response.body).to.have.property("userId")
      } catch (error) {
        chai.assert.fail("unexpected error found in route route > user > GET (single user)")
      }
    })
  })

  describe("route > user > DELETE", () => {
    it("should delete a specified user", async () => {
      try {
        const response = await request(app).delete(`${urlBase}/user/${testUserId}`).set("Accept", "application/json").expect("Content-Type", /json/)

        expect(response.status).to.be.within(200, 299)
        expect(response.body).to.not.be.null
      } catch (error) {
        chai.assert.fail("unexpected error found in route route > user > DELETE")
      }
    })
  })
})
