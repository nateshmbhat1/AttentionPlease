/// <reference path=".\node_modules\@types\express\index.d.ts" />import { urlencoded } from "body-parser";import { FirebaseDatabase } from "@firebase/database-types";import { registerDatabase } from "@firebase/database";import { urlencoded } from "express";import { request } from "https";import { json } from "body-parser";import { request } from "https";import { config } from "firebase-functions";import { decode } from "punycode";import { firebase } from "@firebase/app";import { decode } from "punycode";import { urlencoded } from "body-parser";import { isValidFormat } from "@firebase/util";import { firebase } from "@firebase/app";import { database } from "firebase-admin";import { database } from "firebase-admin";import { firebase } from "@firebase/app";import { firebase } from "@firebase/app";import { urlencoded } from "body-parser";import { userInfo } from "os";import { userInfo } from "os";








//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>   ALL IMPORTS 


var app = require("express")() ; 
var bodyparser = require("body-parser") ; 
var session = require("express-session") ;
var urlencodedParser = bodyparser.urlencoded({extended:true}) ; 
var admin = require("firebase-admin") ;
var firebase_client = require("firebase")  ;
var fs =  require("fs") ; 
var state_dist_colleges = require("./data/state_dist_colleges list (without college details).json") ;
var state_dist_collegewithCODE = require("./data/state_dist_collegeWITHCODE.json") ;
var serviceAccount = require("./service account key/AttentionPlease-d86a646ccc28(working notification).json") ;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://attentionplease-24589.firebaseio.com/"
});


//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<  End of IMPORTS 


app.set('view engine' , 'ejs') ; 
        

module.exports = function HandleRequests(app){
    console.log("Requests Handler running ! ") ;
    Handle_GET(app) ; 
    Handle_POST(app) ; 

}


//Checks if there is a token in the cookie and verfies it and returns true if the requested client is authenticated or not
function isAuthenticated(req , res)
{
    return new Promise((resolve ,reject)=>{
 
    if(req.cookies['__session'])
    {
        admin.auth().verifyIdToken(req.cookies['firebase-token']).then(decodedtoken=>{
            if(decodedtoken.uid){
                console.log("User is signed in :  " , decodedtoken.uid)  ;
                resolve(decodedtoken.uid) ;
            }
            // TODO ROUTE User with the required user details on the page 
        })
        .catch(error=>{
            console.log("User not signed in yet ! ")
            reject(error) ;
            // res.render('login.ejs')
        })

    }
    else
        reject('not signed in ') ;
    
    }) ; 

}

function get_college_code(state , dist ,college)
{

    let myarr = state_dist_collegewithCODE[state][dist]
    for(let i = 0 ; i<myarr.length;  i++)
    {
        if(college==myarr[i][1]){
            return myarr[i][0] ; 
        }
    }
}


function validatePostBody(req , res , keys ){
    for(i in keys){
        if(!(keys[i] in req.body))
        {
            console.log("invalid post request returning ! ") ; 
            return false ; 
        }
    }
    return true ; 
}


//Handles all POST requests 
function Handle_POST(app){

    app.post("/sendnotification" , urlencodedParser , (req , res)=>{
        isAuthenticated(req , res)
        .then(uid=>{
        if(!validatePostBody(req , res , ['topic' , 'title' ,'description'])) return ;

        admin.database().ref('/users/'+uid).once('value' , snap=>{
            userinfo = snap.val() ;
            
            const msg = admin.messaging() ; 
            payload = {
                notification : {
                    title : req.body.title , 
                    body : req.body.description
                } , 

                data : {
                    college : userinfo.college , 
                    state : userinfo.state , 
                    district : userinfo.district , 
                    detail_desc : "",
                    links : "" , 
                    one_line_desc : "" ,
                    title : req.body.title , 
                    topics : req.body.topic
                }
            }
            options = {
                priority : 'high' , 
                timeToLive : 100
            }

            msg.sendToTopic(req.body.topic , payload , options) 
            .then(msg=>console.log(msg))
            .catch(err=>console.log(err)) ;
            console.log("Notification sent succefully to topic : " , req.body.topic , " with title : " , req.body.title) ;
        })

        })
        .catch(err=>{res.render('login.ejs' , {error : err}); return true; })
        
    })

    app.post("/getcolleges" , urlencodedParser , (req,res)=>{
       if(!validatePostBody(req , res , ['state' , 'district'])) return ;

        try{
            console.log("Got college request !") ;
            res.send(state_dist_colleges[req.body.state][req.body.district] ) ;
        }
        catch(error){

           res.status(400) ;
           res.send(error) ;  

        }
    })


    app.post('/updateprofile' , urlencodedParser , (req , res)=>{
        console.log(req.body) ;        
        isAuthenticated(req , res)
        .then(uid=>{
            if(!validatePostBody(req , res , ['name' , 'email' , 'topics' , 'state' , 'district' , 'college' , 'biodata' ])) return ; 

            admin.auth().updateUser(uid , {
                displayName : req.body.name , 
                email : req.body.email , 
            })
            .then(user=>{

                console.log('request body is ') ; console.log(req.body) ;
                let ref = admin.database().ref('/users/' + user.uid) ;
                ref.update({
                    college : req.body.college , 
                    district : req.body.district ,
                    state : req.body.state , 
                    name : req.body.name , 
                    biodata : req.body.biodata , 
                    ccode : get_college_code(req.body.state , req.body.district , req.body.college) ,

                })
                .then(user=>{console.log("Updated successfully !") ; })
                .catch(err=>{consolge.log("ERROR OCCURED ! ") ; console.log(err)}) ; 

            })
            .catch(err=>console.log("Error Occured !" , err)) ; 
            
        })
        .catch(err=>{
                console.log(err) ; 
        }) ;
        
    })



    app.post('/register', urlencodedParser  , (req , res)=>{
        flag_valid = 0 ;
        if(!validatePostBody(req , res , ['state' , 'district' , 'college' , 'email' , 'password' , 'name' , 'year' , 'phone'])) return ;

        if(Object.getOwnPropertyNames(state_dist_colleges).indexOf(req.body.state)>=0){
            if(Object.getOwnPropertyNames(state_dist_colleges[req.body.state]).indexOf(req.body.district)>=0)
            {
                if(state_dist_colleges[req.body.state][req.body.district].indexOf(req.body.college)>=0)
                {
                    flag_valid = 1 ; 
                }
                else{
                    res.render('register.ejs' , {error : "Invalid College Entry . Please make sure that you have selected one of the colleges in the provided list itself."}) ; 
                    return ; 
                }

            }
        }

        if(!flag_valid)
            {
                //CANCEL registration by sending the error ! 
                res.render('register.ejs' , {error : "Invalid Location Details ! "})
                return ; 
            }

        console.log(req.body) ; 
        console.log("started registration handler") ;
       

        admin.auth().createUser({

            email: req.body.email,
            emailVerified: false,
            phoneNumber : "+91"+req.body.phone , 
            password: req.body.password,
            displayName: req.body.name,
            disabled: false
        })
        .then((user)=>{
                console.log("\nUser created with ID : " + user.uid) ; 
    
                //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
                // Populate the USERINFO object with the user's details contained in admin.auth.User and the POST request 
                userinfo = {
                    name : req.body.name , 
                    state : req.body.state , 
                    password : req.body.password , 
                    district : req.body.district , 
                    college : req.body.college ,
                    year : req.body.year
                };
                //Set the collegeID for the user object corresponding to the selected college name 

                userinfo.ccode = get_college_code(userinfo.state , userinfo.district , userinfo.college) ;

                //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
                console.log(userinfo) ;
                ref_user = admin.database().ref("/users/"+user.uid) ;
                ref_user.set(userinfo) ;
                
                res.render('register.ejs', {success: 'You have been registered successfully. Please proceed with Login :) '})

        })


        .catch((error)=>{
            /// TODO : Send the error alert to the client with the error 
            res.status(400) ; 
            res.render( "register.ejs" , {error : error.message}) ;   
            console.log(error)

        }) ; 
    })



    app.post('/createtopic' , urlencodedParser , (req, res)=>{
        console.log(req.body) ;

        isAuthenticated(req,res)
        .then(uid=>{
            if(!validatePostBody(req , res ,['topic'])) return ;            

            console.log("user id is " , uid) ;
            admin.database().ref('/users/'+uid).once('value',snap=>{
                
                userinfo = snap.val() ; 
                let ref = admin.database().ref('/Colleges/' + userinfo.ccode + '/topics') ;

                ref.once('value' , snap=>{
                    
                    arr = snap.val()  ;
                    if(!arr) ref.set([req.body.topic]);
                    else
                    {
                        if(arr.indexOf(req.body.topic)<0) //Insert only if topic doesnt already exists !
                        {
                            arr.push(req.body.topic)
                            ref.set(arr) ;
                        }
                        else{
                            //Topic already exists
                            res.render('createtopic.ejs' , {topicexists : true})
                            return ;
                        }
                    }
                    res.render('createtopic.ejs' , {success : true}) ;
                })

            })

        })
        .catch(err=>{console.log(err) ;res.render('login.ejs')}) ;
    })
   
}



//Handles all the GET request routes 
function Handle_GET(app){
    
    app.get('/' , (req ,res)=>{
        res.redirect('index.html') ;
    })

    app.get('/createtopic' , (req , res)=>{
        isAuthenticated(req , res).then(uid=>res.render('createtopic.ejs')).catch(err=>res.render('login.ejs')) ;
    })

    app.get('/profile' , (req , res)=>{
        isAuthenticated(req , res).then(uid=>{res.render('profile.ejs') ; }).catch(err=>res.render('login.ejs')) ;
    })

    app.get('/home' , (req,res)=>{
        res.redirect('index.html') ; 
    })
  
    app.get('/register' , (req , res)=>{
        res.render("register.ejs" ) ; 
    })

    app.get('/login' , (req , res)=>{

        isAuthenticated(req , res)
        .then(uid=>{console.log("UID logged in : " + uid) ; res.render('dashboard.ejs' );})
        .catch(error=>{console.log(error) ; res.render('login.ejs' ) ; })
    })

    app.get("/dashboard" , (req, res)=>{
        isAuthenticated(req, res)
        .then(uid=>res.render('dashboard.ejs') )  
        .catch(error=>res.render('login.ejs'))  ; 
    })

}