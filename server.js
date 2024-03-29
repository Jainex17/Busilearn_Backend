const app = require('./app.js');
const connectDatabase = require("./db_connect/database")
const cloudinary = require("cloudinary")

// Handling Uncaught exception
process.on("uncaughtException",err=>{
    console.log(`error: ${err.message}`);

    console.log("shutting down the server due to Uncaught exception");
    process.exit(1);
}); 

// connect database
connectDatabase();

cloudinary.v2.config({
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
});

app.get('/',(req,res)=>{
    res.send(`WELCOME TO BUSILEARN BACKEND, FRONTEND IS LIVE ON ${process.env.FRONTEND_URL}`);
});


const server = app.listen(8000,()=>{
    console.log('server runing on 8000');
})

// unhandled Promise Rejection
process.on('unhandledRejection',err=>{
    console.log(`error: ${err.message}`);
    console.log("shutting down the server due to unhadled promise rejection");

    server.close(()=>{
        process.exit(1);
    });
});