const Koa = require('koa');
// const bodyParser = require('koa-bodyparser');  //访问路径中间件
const views = require('koa-views'); //模板页面
const static = require('koa-static'); //静态资源
const Router = require('koa-router'); //路由插件
const cors = require('koa-cors');
const path = require('path');
const app = new Koa();
const fs = require('fs');
const koaBody = require('koa-body').default; // 文件上传
const router = new Router();
const compress = require('koa-compress');
app.use(koaBody({
    multipart: true,
    formidable: {
        maxFileSize: 10*1024*1024    // 设置上传文件大小最大限制，默认2M
    },
    json:true,
    // parsedMethods:['PUT']
}));
// app.use(bodyParser());
const { default:tgz,getCacheData } = require('tgz-get');

const { createUUID, dirExists, readFile, rmDir } = require('./utils');

const staticPath = './static';  //指定静态资源存放的目录

app.use(static(
    path.join(__dirname, staticPath)
))
const options = { 
    threshold: 1024 //数据超过1kb时压缩
};

app.use(compress(options));

app.use(cors({
    origin: function (ctx) {
        return "*"; // 允许来自所有域名请求
    },
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 5,
    credentials: true, // 当设置成允许请求携带cookie时，需要保证"Access-Control-Allow-Origin"是服务器有的域名，而不能是"*";
    allowMethods: ['GET', 'POST', 'DELETE','PUT'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}
));

//设置页面模板目录
app.use(views(path.join(__dirname, './pages'), {
    extension: 'ejs'
}))
app.use(async (ctx, next) => {
    await next();
})

// 路由处理
router
.get('/', async (ctx, next) => {
    // 获取一次列表
    await ctx.render('index', {
        
    })
}).get('/getList',async (ctx, next) => {
    try{
        const data = await getCacheData();
        if(data){
            data.forEach((item)=>{
                item.name = item.name || item.UUID;
                if(item.status === 1){
                    item.url = ctx.request.origin + path.join('/',item.UUID+'.'+item.type);
                }
                if(item.path)delete item.path;
            })
        }
        ctx.body = {
            code:200,
            message:'',
            data
        }
    }catch(err){
        ctx.body = {
            code:500,
            message:'Failed to read content.',
            data:null
        }
    }
    
}).post('/download',async (ctx, next) => {
    let { key,file,fileName } = ctx.request.body;
    if(!key){
      return ctx.body = {
            code:500,
            message:'`key` is required',
            data:{}
        }
    }
    if(file){
        try{
            const extra = key.split('.');
            const pathInfo = key.split('/');
            key = await readFile(path.join(__dirname,staticPath,key),'',extra[extra.length - 1] === 'json');
            key = key.msg;
            rmDir(path.join(__dirname,staticPath,pathInfo[0]));
        }catch(err){
            ctx.body = {
                code:500,
                message:'File parsing failed.',
                data:{}
            }
        }
    }
    const have = await getCacheData();
    if(!Object.keys(have).length){
        rmDir(path.join(__dirname,staticPath));
    }
    let status = -2;
    tgz(key,(message)=>{
        if(message.status !== status){
            console.log(message.msg)
            message = message.status;
        }
    },{ name:fileName });
    ctx.body = {
        code:200,
        message:'Downloader started successfully.',
        data:{}
    }
}).put('/upload',async (ctx, next) => {
    const UUID = createUUID();
    const dir = path.join(__dirname, staticPath,UUID);
    const fileName = ctx.request.files['file'].originalFilename;
    const extra = fileName.split('.');
    if(!['json','lock'].includes(extra[extra.length - 1])){
       return ctx.body = {
            code:500,
            message:'Wrong file type. Only. json and. lock files are supported.',
            data:null
        }
    }
    try{
        await writeFile(ctx.request.files['file'].filepath,dir,fileName);
        ctx.body = {
            code:200,
            message:'File uploaded successfully',
            data:{
                key:path.join(UUID,fileName)
            }
        }
    }catch(err){
        ctx.body = {
            code:500,
            message:err,
            data:null
        }
    }
})

const writeFile = (readPath,writePath,fileName)=>{
    return new Promise(async (resolve,reject)=>{
        const reader = fs.createReadStream(readPath);
        await dirExists(writePath)
        const write = fs.createWriteStream(path.join(writePath,fileName));
        reader.pipe(write);
        // 写完成
        write.on('close',res=>{
            resolve(res)
        })
        write.on('error',err=>{
            reject(err)
        })
    })
}

app
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(3000, () => { console.log('Server start success. Access http://localhost:3000/ to preview') });