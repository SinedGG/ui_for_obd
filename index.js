require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

app.get("/", (req, res) => {
  res.render("menu.ejs");
});

app.get("/sql/:param", async (req, res) => {
  try {
    var param = req.params.param;
    var [query] = await db.query(`SELECT * FROM ${param}`);
    res.render("table.ejs", { data: format_data(query) });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
});

app.get("/msa/:param", async (req, res) => {
  try {
    var param = req.params.param;
    const { readFileSync } = require("fs");
    const MDBReader = require("mdb-reader");
    const buffer = readFileSync("db.mdb");
    const reader = new MDBReader(buffer);
    const table = reader.getTable(param);
    res.render("table.ejs", { data: format_data(table.getData()) });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
});

app.get("*", (req, res) => {
  res.redirect("/");
  //res.send(404);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

function format_data(query) {
  return (data = {
    size: {
      r: query.length,
      c: Object.keys(query[0]).length,
    },
    head: Object.keys(query[0]),
    table: query,
  });
}

function toBase64(arr) {
  //arr = new Uint8Array(arr) if it's an ArrayBuffer
  return btoa(arr.reduce((data, byte) => data + String.fromCharCode(byte), ""));
}
