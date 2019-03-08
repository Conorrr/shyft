var express = require('express')
var multer  = require('multer')

var upload = multer()
var app = express()
const port = 3000
 
app.post('/single', upload.single('single'), function (req, res, next) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
})
 
app.post('/multi', upload.array('multi', 12), function (req, res, next) {
  // req.files is array of `photos` files
  // req.body will contain the text fields, if there were any
})
 
function imageTag(rawImage) {
  var b64Image = rawImage.buffer.toString('base64')
  return `<img src="data:${rawImage.mimeType};base64,${b64Image}"/><br>`
}

var cpUpload = upload.fields([{ name: 'single'}, { name: 'multi', maxCount: 8 }])
app.post('/mixed', cpUpload, function (req, res, next) {

  // req.files is an object (String -> Array) where fieldname is the key, and the value is array of files
  //
  // e.g.
  //  req.files['avatar'][0] -> File
  //  req.files['gallery'] -> Array
  //
  // req.body will contain the text fields, if there were any
  res.set('Content-Type', 'text/html; charset=utf-8')

  console.log(req.body)
  res.write("body")
  res.write(`<pre>${JSON.stringify(req.body)}</pre>`)

  if (req.files['single']) {
    console.log(req.files['single'][0]);
    res.write(`originalName: ${req.files['single'][0].originalname}<br>`)
    res.write(imageTag(req.files['single'][0]))
  }

  if (req.files['multi']) {
    for (image of req.files['multi']) {
      console.log(image);
      res.write(`originalName: ${image.originalname}<br>`)
      res.write(imageTag(image))
    }
  }

  res.end()
})

app.use(express.static('static'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))