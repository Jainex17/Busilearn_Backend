const Course = require("../models/CourseModels");
const ErrorHander = require("../utils/errorHander");
const catchAsyncError = require('../middleware/catchAsyncError');
const ApiFeatures = require("../utils/apifeatures");
const cloudinary = require('cloudinary');
const getDataUri = require("../utils/datauri");

// create/add course -- Teacher
exports.createCourse = catchAsyncError(async (req,res,next)=>{
    
    const {title,description,price,catagory,createBy} = req.body;
    const file = req.file;

    if(price < 10) return next(new ErrorHander("Price can't be negative or less then 10",409));
    
    let coursedata = await Course.findOne({ title: { $regex: title, $options: "i" } });
    if(coursedata) return next(new ErrorHander("Someone already took this course title",409));
    
    const fileUri = getDataUri(file);
    const mycloud = await cloudinary.v2.uploader.upload(fileUri.content);
    const course = await Course.create({
        title,
        description,
        price,
        catagory,
        createBy,
        poster:{
            public_id:mycloud.public_id,
            url:mycloud.secure_url,
        },
        active:false,
    });

    res.status(201).json({
        success:true,
        course
    })
});

// get all course
exports.getAllCourse = catchAsyncError(async(req,res) =>{
    
    try{
        const productCount = await Course.countDocuments();
        
        const apiFeatures = new ApiFeatures(Course.find(),req.query).search().filter()
    
        const courses = await apiFeatures.query;
    
        res.status(200).json({
            success:true,
            courses,
            productCount,
        })
    }
    catch(error){
        res.status(404).json({
            success:false,
            message:error.message,
        })
    }
});

// get all course
exports.getAllCourseins = catchAsyncError(async(req,res) =>{
    
    const userid = req.user.id;
    
    const courses = await Course.find({ "createBy.creatorid": userid });
    
    res.status(200).json({
        success:true,
        courses,
        
    })
});
// get all course admin
exports.getAllCourseadmin = catchAsyncError(async(req,res) =>{
    
    const productCount = await Course.countDocuments();
    
    const courses = await Course.find().sort({createAt: -1});

    res.status(200).json({
        success:true,
        courses,
        productCount,
    })
});

// get single course lecture 
exports.getCourseLectures = catchAsyncError(async(req,res,next)=>{
    let course = await Course.findById(req.params.id);

    if(!course){
        return next(new ErrorHander("course not found",404));
    }

    course.views += 1;
    course.save();
    res.status(200).json({
        success:true,
        lectures: course.lectures
    })
});

// add lectures Max video size 100MB
exports.addCourseLectures = catchAsyncError(async(req,res,next)=>{

    const {id} = req.params;
    const {title,desc} = req.body;
    
    let course = await Course.findById(id);
    if(!course){
        return next(new ErrorHander("course not found",404));
    }

    const file = req.file;
    const fileUri = getDataUri(file);
    const mycloud = await cloudinary.v2.uploader.upload(fileUri.content,{
        resource_type:"video",
    });
    
    course.lectures.push({
        title,
        desc,
        video:{
            public_id: mycloud.public_id,
            url: mycloud.secure_url,
        },
    });
    course.active = true;

    course.noOfVideos = course.lectures.length;
    await course.save();
    res.status(200).json({
        success:true,
        message:"lectures added in course"
    })
});
 

// update course --teacher/admin
exports.updateCourse= catchAsyncError(async(req,res,next)=>{

    let course = await Course.findById(req.params.id);

    if(!course){
        return next(new ErrorHander("course not found",404));
    }

    course = await Course.findByIdAndUpdate(req.params.id,req.body,{
        new:true, runValidators:true
    });

    res.status(200).json({
        success:true,
        course
    })
});

// delete course - teacher,admin
exports.deleteCourse = catchAsyncError(async(req,res,next)=>{

    let course = await Course.findById(req.params.id);

    if(!course){
        return next(new ErrorHander("course not found",404));
    }
    await cloudinary.v2.uploader.destroy(course.poster[0].public_id); 

    for (let i = 0; i < course.lectures.length; i++) {
        const singleLecture = course.lectures[i];
        await cloudinary.v2.uploader.destroy(singleLecture.video[0].public_id,{
            resource_type:"video",
        }); 
    }
    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success:true,
        message:"course deleted successfuly"
    })
});

// delete lectures - teacher,admin
exports.deleteLecture= catchAsyncError(async(req,res,next)=>{

    const {courseId,lectureId} = req.query;

    let course = await Course.findById(courseId);

    if(!course){
        return next(new ErrorHander("course not found",404));
    }
    const lecture = await course.lectures.find((item)=>{
        if(item._id.toString() === lectureId.toString()) return item;
    })
    await cloudinary.v2.uploader.destroy(lecture.video[0].public_id,{
        resource_type:"video",
    });
    
    course.lectures.filter( item=>{
        if(item._id.toString() !== lectureId.toString()) return item;
    })
     await Course.updateOne(
        {_id:courseId},
        {$pull:{lectures:{_id:lectureId}}},
    )

    if(course) course.noOfVideos = course.lectures.length; 
    
    await course.save();
    
    res.status(200).json({
        success:true,
        message:"lectures deleted successfuly"
    })
});

// active deactive user
exports.activeDeactiveCourse = catchAsyncError(async(req,res,next)=>{
    let course = await Course.findById(req.params.id)
    if(!course){
        return next(new ErrorHander("course not found",404));
    }

    if(course.lectures.length === 0){
        return next(new ErrorHander("you can't active this course",404));
    }

    if(course.active == true) course.active=false
    else course.active=true

    await course.save();

    res.status(200).json({
        success:true,
        message:"course behavior change successfully"
    })
});

// get all reviews
exports.getAllReviews = catchAsyncError(async(req,res,next)=>{
    
    const courseid = await req.params.courseid;
    // const user = await User.findById(req.user.id);
    
    if(!courseid){
        return next(new ErrorHander("course not found",404));
    }
    const course = await Course.find({ _id: courseid }).sort({createAt: -1});
    const reviews = course[0].reviews;


    res.status(200).json({
        success:true,
        reviews
    })
});