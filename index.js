const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const fileUpload = require("express-fileupload");
const fs = require("fs-extra");
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ory2v.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("doctors-image"));
app.use(fileUpload());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

client.connect((err) => {
  const appointmentCollection = client.db("doctorsPortal").collection("appointment");
  const doctorsCollection = client.db("doctorsPortal").collection("doctors");
  const adminsCollection = client.db("doctorsPortal").collection("admins");

  app.post("/checkAdmin", (req, res) => {
    const email = req.body.email;
    adminsCollection.find({ email: email }).toArray((err, admin) => {
      if (admin.length === 0) {
        doctorsCollection.find({ doctorEmail: email }).toArray((err, doctor) => {
          res.send(doctor.length > 0);
        });
      } else {
        res.send(admin.length > 0);
      }
    });
  });

  app.post("/addAppointment", (req, res) => {
    const appointment = req.body;
    appointmentCollection.insertOne(appointment).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.post("/appointmentByDate", (req, res) => {
    const date = req.body.date;
    const email = req.body.email;
    const filter = { appointmentDate: date };

    doctorsCollection.find({ doctorEmail: email }).toArray((err, doctor) => {
      if (doctor.length === 0) {
        filter.patientEmail = email;
      }
      appointmentCollection.find(filter).toArray((err, doc) => {
        res.send(doc);
      });
    });
  });

  app.get("/appointments", (req, res) => {
    appointmentCollection.find({}).toArray((err, doc) => {
      res.send(doc);
    });
  });

  // app.post("/uploads", (req, res) => {
  //   const img = req.files.doctorImg;

  //   img.mv(`${__dirname}/doctors-image/doctor-${img.name}`, (err) => {
  //     if (err) {
  //       console.log("File not uploaded");
  //       return res.status(500).send({ msg: "Fail to upload." });
  //     }
  //     res.send({ name: `doctor-${img.name}` });
  //   });
  // });

  app.post("/addDoctor", (req, res) => {
    const img = req.files.doctorImg;
    const name = req.body.doctorName;
    const email = req.body.doctorEmail;
    const specialist = req.body.specialist;
    const doctorInfo = {
      doctorName: name,
      specialist: specialist,
      doctorEmail: email,
    };
    const filePath = `${__dirname}/doctors-image/doctor-${img.name}`;
    img.mv(filePath, (err) => {
      if (err) {
        console.log("File Not uploaded");
        res.status(500).send({ msg: "Failed to upload." });
      }
      const newImg = fs.readFileSync(filePath);
      const encImg = newImg.toString("base64");

      const image = {
        type: img.mimetype,
        size: img.size,
        img: Buffer(encImg, "base64"),
      };

      doctorsCollection.insertOne({ ...doctorInfo, doctorImg: image }).then((result) => {
        fs.remove(filePath, (error) => {
          if (error) {
            console.log(error);
            res.status(500).send({ msg: "Failed to upload." });
          }
          res.send(result.insertedCount > 0);
        });
      });
    });
  });

  app.get("/doctors", (req, res) => {
    doctorsCollection.find({}).toArray((err, doc) => {
      res.send(doc);
    });
  });

  app.delete("/removeDoctor", (req, res) => {
    const id = req.query.id;
    doctorsCollection.deleteOne({ _id: ObjectID(id) }).then((result) => {
      res.send(result.deletedCount > 0);
    });
  });

  console.log(err);
});

app.listen(port);
