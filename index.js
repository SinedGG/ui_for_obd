require("dotenv").config(); //бібліотека для завантаження захищених змінних
const express = require("express"); //бібліотека для ствлрення веб сервера
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const mysql = require("mysql2/promise"); //бібліотека для взаємодії з БД

const db = mysql.createPool({
  //створення підключкння до БД
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

app.get("/", (req, res) => {
  //стандартний кореневий маршрут
  res.render("menu.ejs"); //відправлення файлу для відображення
});

app.get("/sql/:param", async (req, res) => {
  //маршрут для таблиці з використанням SQL
  try {
    var param = req.params.param;
    var [query] = await db.query(`SELECT * FROM ${param}`);
    var data = format_data(query);
    data.current_page = param;
    res.render("table.ejs", { data: data });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
});

app.get("/msa/:param", async (req, res) => {
  //маршрут для таблиці з використанням парсингу .accdb
  try {
    var param = req.params.param;
    const { readFileSync } = require("fs"); // файлова бібліотка
    const MDBReader = require("mdb-reader"); // бібліотека для парсингу access файлу
    const buffer = readFileSync("a.accdb"); //читання файлу
    const reader = new MDBReader(buffer); //парсинг
    const table = reader.getTable(param); // читання таблиці
    res.render("simple_table.ejs", { data: format_data(table.getData()) });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
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

app.post("/api/datalist", async (req, res) => {
  // отримання даних для заповнення випадаючтго списку
  var table = req.query.table;
  const allowed = ["climate", "station", "culture", "varieties"];
  if (allowed.indexOf(table) == -1) return res.send(403);
  var out = [];
  var [data] = await db.query(`select id_${table} from ${table}`);
  for (let i = 0; i < data.length; i++) {
    out.push(data[i][`id_${table}`]);
  }
  res.send(out);
});

app.post("/api/edit", async (req, res) => {
  // маршрут редагування даних
  var table = req.query.table;
  var key = req.query.key;
  var key_value = req.query.key_value;
  var data = JSON.parse(req.query.data);
  try {
    if (table == "culture") {
      await db.query(
        `UPDATE culture SET id_culture = '${data[0]}', culture_name_ukr = '${data[1]}', culture_name_lat =  '${data[2]}' WHERE ${key} = '${key_value}'`
      );
    } else if (table == "varities") {
      await db.query(
        `UPDATE varities SET id_varieties = '${data[0]}', id_culture = '${data[1]}', varieties_name =  '${data[2]}' WHERE ${key} = '${key_value}'`
      );
    } else if (table == "climate") {
      await db.query(
        `UPDATE climate SET name_climate = '${data[0]}', id_climate = '${data[1]}', condition_info =  '${data[2]}' WHERE ${key} = '${key_value}'`
      );
    } else if (table == "station") {
      await db.query(
        `UPDATE station SET id_station = '${data[0]}', id_climate = '${data[1]}', station_name =  '${data[2]}', address =  '${data[3]}', area =  '${data[4]}', director =  '${data[5]}', phone_number =  '${data[6]}' WHERE ${key} = '${key_value}'`
      );
    } else if (table == "tests") {
      var key_value = key_value.split(",");
      await db.query(
        `UPDATE tests SET id_varieties = '${data[0]}', id_culture = '${data[1]}', id_station =  '${data[2]}', test_year = '${data[3]}', productivity = '${data[4]}'  
       WHERE  id_varieties='${key_value[0]}' AND id_culture='${key_value[1]}' AND id_station='${key_value[2]}' AND test_year='${key_value[3]}' AND productivity='${key_value[4]}'
       LIMIT 1`
      );
    } else {
      return res.send(403);
    }
    return res.send(200);
  } catch (error) {
    console.log(error);
    return res.send(403);
  }
});

app.get("*", (req, res) => {
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
