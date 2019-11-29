var express = require("express");
var router = express.Router();
var passport = require("passport");
var uid2 = require("uid2");

var User = require("../models/User.js");

// Importation de Cloudinary
var cloudinary = require("cloudinary");
// Configuration de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post("/sign_up", function(req, res, next) {
  User.register(
    new User({
      email: req.fields.email,
      // L'inscription créera le token permettant de s'authentifier auprès de la strategie `http-bearer`
      token: uid2(16), // uid2 permet de générer une clef aléatoirement. Ce token devra être regénérer lorsque l'utilisateur changera son mot de passe
      account: {
        username: req.fields.username,
        name: req.fields.name,
        description: req.fields.description
      }
    }),
    req.fields.password, // Le mot de passe doit être obligatoirement le deuxième paramètre transmis à `register` afin d'être crypté
    function(err, user) {
      if (err) {
        res.status(400);
        return next(err.message);
      } else {
        return res.json({
          _id: user._id,
          token: user.token,
          account: user.account
        });
      }
    }
  );
});

router.post("/log_in", function(req, res, next) {
  passport.authenticate("local", { session: false }, function(err, user, info) {
    if (err) {
      res.status(400);
      return next(err.message);
    }
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({
      _id: user._id,
      token: user.token,
      account: user.account
    });
  })(req, res, next);
});

const uploadPictures = (req, res, next) => {
  // J'initialise un tableau vide pour y stocker mes images uploadées
  const pictures = [];
  // J'initialise le nombre d'upload à zéro
  let filesUploaded = 0;
  // Et pour chaque fichier dans le tableau, je crée un upload vers Cloudinary
  const files = Object.keys(req.files);
  if (files.length) {
    files.forEach(fileKey => {
      // Je crée un nom spécifique pour le fichier
      const name = uid2(16);
      cloudinary.v2.uploader.upload(
        req.files[fileKey].path,
        {
          // J'assigne un dossier spécifique dans Cloudinary pour chaque utilisateur
          public_id: `airbnb/${req.user._id}/${name}`
        },
        (error, result) => {
          console.log(error, result);
          // Si j'ai une erreur avec l'upload, je sors de ma route
          if (error) {
            return res.status(500).json({ error });
          }
          // Sinon, je push mon image dans le tableau
          pictures.push(result.secure_url);
          // Et j'incrémente le nombre d'upload
          filesUploaded++;
          console.log("-------\n", result);
          // Si le nombre d'uploads est égal au nombre de fichiers envoyés...
          if (filesUploaded === files.length) {
            /* res
                        .status(200)
                        .json({message: `You've uploaded ${filesUploaded} files.`}); */
            // ... je stocke les images dans l'objet `req`...
            req.pictures = pictures;
            // ... et je poursuis ma route avec `next()`
            next();
          }
        }
      );
    });
  } else {
    // Pas de fichier à uploader ? Je poursuis ma route avec `next()`.
    next();
  }
};

// L'authentification est obligatoire pour cette route
router.post("/upload_picture", uploadPictures, function(req, res, next) {
  passport.authenticate("bearer", { session: false }, async function(
    err,
    user,
    info
  ) {
    if (err) {
      res.status(400);
      return next(err.message);
    }
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      user.account.photos = req.pictures;
      await user.save();
      res.json(req.pictures);
    } catch (err) {
      console.log(err.message);
      res.status(400).json(err.message);
      // res.status(400);
      // return next(err.message);
    }
  })(req, res, next);
});

// L'authentification est obligatoire pour cette route
router.get("/:id", function(req, res, next) {
  passport.authenticate("bearer", { session: false }, function(
    err,
    user,
    info
  ) {
    if (err) {
      res.status(400);
      return next(err.message);
    }
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    User.findById(req.params.id)
      .select("account")
      .populate("account.rooms")
      .populate("account.favorites")
      .exec()
      .then(function(user) {
        if (!user) {
          res.status(404);
          return next("User not found");
        }

        return res.json({
          _id: user._id,
          account: user.account
        });
      })
      .catch(function(err) {
        res.status(400);
        return next(err.message);
      });
  })(req, res, next);
});

module.exports = router;
