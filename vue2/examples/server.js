const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.all('*', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods","*");
  // res.header("X-Powered-By",' 3.2.1')
  // res.header("Content-Type", "application/json;charset=utf-8");
  next();
});
app.get('/test', function(req, res){
  res.json(req.query)
  return
})
app.post('/test', function(req, res){
  console.log("有请求", req.method)
  console.log("有请求", req.body)
  if(req.method === 'OPTIONS') return res.end(200)
  // console.log(Object.keys(req), Object.keys(res),'=========================');
  res.json(req.body)
  return
})


app.listen(8080, ()=> console.log("监听 8080 端口"))
