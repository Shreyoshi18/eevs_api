require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const Vonage = require('@vonage/server-sdk');
const bcrypt = require('bcrypt-nodejs');
const port = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json());
app.use(cors());
const connection = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	port: process.env.DB_PORT,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE
});

connection.connect(function(err) {
  if (err) {
    throw err;
  }
 else{
 	console.log("connected");
 }
  
}); 

const vonage = new Vonage({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET
}); 

app.get('/', (req, res) => {
			connection.query("SELECT * FROM registered_voter_list", function(error,rows,fields){
				if(error){
					console.log("error in query");
				}else{
					res.json(rows);
					console.log(rows);
				}
			});
});

app.get('/voter/:id', (req,res) =>{
	const {id} = req.params;
			connection.query("SELECT * FROM registered_voter_list WHERE voter_id = ? " , [id] , function(error,rows,fields){
				if(error){
					throw error;
				}else if(rows.length > 0){
					res.json(rows[0]);
					console.log(rows);
					return;
				}else{
					res.status(400).json("no such voter");
				}
			});
	
});

app.post('/register', (req,res) =>{
	const {voter_id , name , contact_number, password , repassword} = req.body;
	if(repassword === password){
			const hashpass = bcrypt.hashSync(password);
			connection.query("SELECT constituency,contact_number FROM official_voter_list WHERE voter_id = ? && voter_name = ? " , [voter_id,name] , function(error,rows,fields){ 
				if(error){
					return res.status(400).json("server error");
				}else if(rows.length > 0){
					const constituency = rows[0].constituency;
					const cn = rows[0].contact_number;
					if(cn === contact_number){
						console.log(constituency);
						console.log(cn);
						connection.query("INSERT INTO registered_voter_list values(?,?,?,?,?,?)" , [voter_id,name,contact_number,0,constituency,hashpass] , function(error,rows,fields){
							if(error){
							return res.status(400).json("already-reg");
								
							}
							else{
								return res.json("success");
							}
						}); 
					}else{
						res.status(400).json("wrong-num");
					}
					
				}else{
					res.status(400).json("no-reg");
				}
			});
	}
	else{
		res.status(400).json("no-match");	
	}
});
 
app.put('/voter/:id', (req,res) =>{
	const {id} = req.params;
	const {choice} = req.body;
			connection.query("SELECT * FROM registered_voter_list WHERE voter_id = ? " , [id] , function(error,rows,fields){ 
					if(error){
						throw error;
						
					}else{
						if(rows[0].has_voted === 0){
							const constituency = rows[0].constituency;
							connection.query("UPDATE registered_voter_list SET has_voted = ? WHERE voter_id = ?  " , [1,id] , function(error,rows,fields){ 
								if(error){
									console.log(constituency);
									res.status(400).json("user has already voted");
									
								}else{
									console.log(choice);
									if(choice === 'BJP'){
										connection.query("UPDATE vote_count_list SET BJP = BJP + 1 WHERE constituency = ?  " , [constituency] , function(error,rows,fields){ 
											if(error){
												return res.status(400).json("user has already voted");
											}else{
												return res.json("success");
											}
										});
									}else if(choice === 'AIC'){
										connection.query("UPDATE vote_count_list SET AIC = AIC + 1 WHERE constituency = ?  " , [constituency] , function(error,rows,fields){ 
											if(error){
												return res.status(400).json("user has already voted");
											}else{
												return res.json("success");
											}
										});
									}else if(choice === 'AITMC'){
										connection.query("UPDATE vote_count_list SET AITMC = AITMC + 1 WHERE constituency = ?  " , [constituency] , function(error,rows,fields){ 
											if(error){
												return res.status(400).json("user has already voted");
											}else{
												return res.json("success");
											}
										});
									}else if(choice === 'CPIM'){
										connection.query("UPDATE vote_count_list SET CPIM = CPIM + 1 WHERE constituency = ?  " , [constituency] , function(error,rows,fields){ 
											if(error){
												return res.status(400).json("user has already voted");
											}else{
												return res.json("success");
											}
										});
									}else{
										connection.query("UPDATE vote_count_list SET NOTA = NOTA + 1 WHERE constituency = ?  " , [constituency] , function(error,rows,fields){ 
											if(error){
												return res.status(400).json("user has already voted");
											}else{
												return res.json("success");
											}
										});
									}
								}
							});
						}else{
							res.status(400).json("user has already voted");
						}
						
					}
				});
	
});

 app.post('/login',(req,res) =>{
 	const {voter_id,password} = req.body;
 	// const hashpass 
			connection.query("SELECT * FROM registered_voter_list WHERE voter_id = ? " , [voter_id] , function(error,rows,fields){
				if(error){
					console.log("gulugulu");
				}else if(rows.length > 0 ){
					if(bcrypt.compareSync(password, rows[0].password)){
						if(rows[0].has_voted === 0){
							res.json(rows);
							console.log(rows[0]);
							return;
						}else{
							res.status(400).json("has-voted");
						}
					}else{
						res.status(400).json("wrong-pass");
					}
					
				}else{
					res.status(400).json("not such voter");
				}
			});
 	
 });

app.post('/forgot', (req, res) => {
    // A user registers with a mobile phone number
    let phoneNumber = req.body.number;
    console.log(phoneNumber);
			connection.query("SELECT * FROM registered_voter_list WHERE contact_number = ? " , [phoneNumber] , function(error,rows,fields){
				if(error){
					throw error;
				}else if(rows.length > 0){
					vonage.verify.request({number: phoneNumber, brand: "Vonage"}, (err, result) => {
				      if(err) {
				        //res.sendStatus(500);
				       	res.status(400).json('server error');
				      } else {
				        console.log(result);
				        let requestId = result.request_id;
				        if(result.status == '0') {
				        	console.log(result.request_id);
				          return res.json(result);
				          // const ans = verified(phoneNumber);
				        } else {
				          //res.status(401).send(result.error_text);
				          return res.status(400).json(result.error_text);
				        }
				      }
				    });
				}else{
					return res.status(400).json("no-reg");
				}
			});

  });

	app.post('/confirm', (req, res) => {
    // Checking to see if the code matches
    	const {pin , requestId , password , repassword , phoneNumber } = req.body;
	    console.log('value of requestid in verify post handler is ' + requestId);
	  	if(password === repassword){
	  		const hashpass = bcrypt.hashSync(password);
		    vonage.verify.check({request_id: requestId, code: pin}, (err, result) => {
		      if(err) {
		        //res.status(500).send(err);
		        return res.status(400).json('server error');
		      } else {
		        console.log(result);
		        // Error status code: https://docs.nexmo.com/verify/api-reference/api-reference#check
		        if(result && result.status == '0') {
		          //res.status(200).send('Account verified!');
						connection.query("UPDATE registered_voter_list SET password = ? WHERE contact_number = ?" , [hashpass , phoneNumber] , function(error,rows,fields){
							if(error){
								throw error;
							}else{
								return res.json('set');
							}
						});
		        } else {
		          //res.status(401).send(result.error_text);
		          return res.status(400).json(result.error_text);
		        }
		      }
		    });
	  	}
	  	else{
	  		res.status(400).json("the re-entered password doesnt match the original password");	
	  	}	
  });
	app.post('/otpconfirm', (req, res) => {
    // Checking to see if the code matches
    	const {pin , requestId} = req.body;
	    console.log('value of requestid in verify post handler is ' + requestId);
	  	
		    vonage.verify.check({request_id: requestId, code: pin}, (err, result) => {
		      if(err) {
		        //res.status(500).send(err);
		        return res.status(400).json('server error');
		      } else {
		        console.log(result);
		        // Error status code: https://docs.nexmo.com/verify/api-reference/api-reference#check
		        if(result && result.status == '0') {
		          //res.status(200).send('Account verified!');
		          return res.json('set');
		        } else {
		          //res.status(401).send(result.error_text);
		          return res.status(400).json(result.error_text);
		        }
		      }
		    });
	
  });

app.listen(port,() =>{
	console.log("App is listening");
});