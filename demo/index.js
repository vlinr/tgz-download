const tgz = require('../lib/tgz.download');
const { readFile } = require('../src/fs.js');
// package.json文件
readFile('./demo/yarn.lock').then(res=>{
    tgz.default(res.msg,res=>{
         console.log(res)
    })
})

// package-lock 文件
// readFile('../package-lock.json').then(res=>{
//     console.log(res)
//     npm_tgz(res.msg,console.log)
// })

// yarn.lock 文件
// readFile('./yarn.lock','',false).then(res=>{
//     tgz(res.msg,console.log)
// })

// tgz('es5-ext',console.log)

