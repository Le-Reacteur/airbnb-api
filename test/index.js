require("dotenv").config();
var chai = require("chai");
var expect = require("chai").expect;
var chaiHttp = require("chai-http");
chai.use(chaiHttp);

describe("GET /", function() {
  it("respond with welcome message", function(done) {
    chai
      .request("http://localhost:" + process.env.PORT)
      .get("/")
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.equal("Welcome to the Airbnb API.");
        done();
      });
  });
});

describe("GET /api/home", function() {
  it("respond with cities and featured", function(done) {
    chai
      .request("http://localhost:" + process.env.PORT)
      .get("/api/home")
      .end(function(err, res) {
        expect(err).to.be.null;
        expect(res).to.be.json;
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("cities").to.be.a("array");
        expect(res.body).to.have.property("featured").to.be.a("array");
        done();
      });
  });
});
