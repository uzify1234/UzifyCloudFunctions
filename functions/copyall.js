const functions = require("firebase-functions");
var fetch = require('node-fetch');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const schedule = require('node-schedule');
const cron = require('node-cron');

exports.sendPushNotificationordercreate = functions.firestore.document('orders/{ordid}').onCreate((change) => {
    console.log("New Order creeated "+change.id);
    var starttime = change.data().starttimeepoc;
    var today = Math.round((new Date()).getTime() / 1000);
    var epoch_time = 0;
    if(today > starttime) {
        console.log("T > S");
        starttime = today;
        // epoch_time = (starttime * 1000) + (5.5 * 60 * 60 * 1000);
        epoch_time = (starttime * 1000) + (5.5 * 60 * 60 * 1000) + (20 * 1000);


    }
    else {
        //  epoch_time = (starttime * 1000) - (3 * 60 * 60 * 1000);
         epoch_time = (starttime * 1000) + (20 * 1000);


    }
    console.log(today+" is today");
 
    var date_obj = new Date(epoch_time);
    console.log(date_obj);
    const hrs = date_obj.getHours();
    var mins = date_obj.getMinutes();
    var secs = date_obj.getSeconds();
    if(secs > 60)
    {
        mins = mins + 1;
        secs = 10;
    }
    const day = date_obj.getDate();
    const month = date_obj.getMonth();
    const year = date_obj.getFullYear();
    console.log(day+"/"+month+"/"+year+" "+hrs+":"+mins+":"+secs);
    const date = new Date(year, month, day, hrs, mins,secs).toUTCString();
    var fl = mins+' '+hrs+' * * *';
    var ffl = mins+' '+hrs+' '+day+' '+month+' *';
    console.log(date);
    console.log(ffl);




      const rule = new schedule.RecurrenceRule();
      rule.tz = 'Asia/Kolkata';
      rule.year = year;    //Your scheduling time YYYY/MM/DD HH:mm:ss
      rule.month = month;
      rule.date = day;
      rule.hour = hrs;
      rule.minute = mins;
      rule.second = secs;
      schedule.scheduleJob(rule, async function () {
          console.log("Scheduled")
          var orderid = change.id;
          db.collection('orders').doc(orderid).get().then(orddet => {
              if(orddet.data().status == 'pending') {
                db.collection('users').doc(orddet.data().userid).get().then(alldatauser => {
                    console.log(alldatauser.data());
                    var tokenuser = alldatauser.data().notificationtoken;
                    console.log("Token user is "+tokenuser);
                    var dt = new Date((starttime - (5.5 * 60 * 60)) * 1000);
                    var coluser = {
                        to : tokenuser,
                        title : 'Booking Alert',
                        body : 'Hi '+alldatauser.data().name+',You have an upcoming booking on '+date_obj.toLocaleString(),
                        data : {type : 'upcomingbookingalert',bookingid : change.id},
                        sound : 'default'
                    }
                    fetch('https://exp.host/--/api/v2/push/send',{
                        method : "POST",
                        header : {
                            "Accept" : "application/json",
                            "Content-Type" : "application/json"
                        },
                        body : JSON.stringify(coluser)
                    })
                })
              }
              if(orddet.data().status == 'pending' && orddet.data().assignedpartner != '') {
                db.collection('partners').doc(orddet.data().assignedpartner).get().then(alldatauser => {
                    console.log(alldatauser.data());
                    var tokenuser = alldatauser.data().notificationtoken;
                    console.log("Token user is "+tokenuser);
                    var dt = new Date(starttime * 1000);
                    var coluser = {
                        to : tokenuser,
                        title : 'Booking Alert',
                        body : 'Hi '+alldatauser.data().name+',You have an upcoming booking on '+date_obj.toLocaleString(),
                        data : {type : 'upcomingbookingalert',bookingid : change.id},
                        sound : 'default'
                    }
                    fetch('https://exp.host/--/api/v2/push/send',{
                        method : "POST",
                        header : {
                            "Accept" : "application/json",
                            "Content-Type" : "application/json"
                        },
                        body : JSON.stringify(coluser)
                    })
                })
              }
          })
      });

   
 
    
    
})

exports.sendPushNotification = functions.firestore.document('partners/{id}/bookingsonqueue/{bid}').onCreate((change) => {
    console.log("New ID creeated "+change.id);
    console.log(change.data().userid);
    if(change.data().userid != undefined) {
    db.collection('partners').doc(change.data().userid).get().then(alldata => {
        console.log(alldata.data());
        var token = alldata.data().notificationtoken;
        console.log("Token is "+token);
        var col = {
            to : token,
            title : 'New Booking',
            body : 'Hi '+alldata.data().name+',You have received a booking, You have 15 minutes to accept it',
            data : {type : 'bookingalert'},
            sound : 'default'
        }
        fetch('https://exp.host/--/api/v2/push/send',{
            method : "POST",
            header : {
                "Accept" : "application/json",
                "Content-Type" : "application/json"
            },
            body : JSON.stringify(col)
        })
    })
    }
    
})


exports.sendPushNotificationforrefunds = functions.firestore.document('refunds/{refundid}').onUpdate((change, context) => {
    justsetforrefunds();

});

const justsetforrefunds = () => {
    var today = Math.round((new Date()).getTime() / 1000);
    var allproms = [];

    console.log("refund function");
     db.collection('orders').where('status','==','pending').where('starttimeepoc','<',today).where('selectedpaymentmode','==','Online Prepaid').get().then(allord => {
        allord.docs.map(eachord => {
            if(eachord.data().refundinitiated == true) {
                
            }
            else {
                console.log("Need refund for "+eachord.id);
                var np = new Promise((resolve,reject) => {
                    db.collection('userorderstransactions').doc(eachord.data().transactionid).get().then(transinfo => {
                        console.log(transinfo.data());
                        // var url = 'https://www.payumoney.com/treasury/merchant/refundPayment?merchantKey='+'eXzZaR'+'&paymentId='+transinfo.data().mihpayid+'&refundAmount=1';
                        var url = 'https://www.payumoney.com/treasury/merchant/refundPayment';
                        console.log(url);


                        const data = {
                            merchantKey: 'eXzZaR',
                                paymentId: transinfo.data().mihpayid,
                                refundAmount : 1
                        }

                        const header = {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
                            "Content-Type": "application/json",
                            "authorization" : "Jjw7ra3BdXgVvYAgtlYo6aGJX34ETVFM"
                        }

                        axios({
                            method: 'post',
                            url: url,
                            data: data,
                            headers: header
                        })
                        .then((res)=>{console.log(res); resolve(res);})
                        .catch((err)=>{reject(err);})
                      

                        // fetch('https://mywebsite.com/endpoint/', {
                        //     method: 'POST',
                        //     headers: {
                        //         'Accept': 'application/json',
                        //         'Content-Type': 'application/json',
                        //     },
                        //     body: JSON.stringify({
                        //         merchantKey: 'eXzZaR',
                        //         paymentId: transinfo.data().mihpayid,
                        //         refundAmount : 1
                        //     })
                        // }).then(function (response) {
                        //     console.log(response);
                        //   });
                    })
                })
            }
            
        })
    })
}

exports.sendPushNotification2 = functions.firestore.document('orders/{ordid}').onUpdate((change, context) => {

    const data = change.after.data();
      const previousData = change.before.data();
      console.log(data);
      console.log(data.allocatedpartner);
      console.log(data.status);
      console.log(previousData.status);
      if(data.allocatedpartner != "" && data.status == "running" && previousData.status == "pending") {
        // db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
        //     console.log(alldata.data());
        //     var token = alldata.data().notificationtoken;
        //     console.log("Token is "+token);
        //     var col = {
        //         to : token,
        //         title : 'Booking Started',
        //         body : 'Hi '+alldata.data().name+',Your booking has been started',
        //         data : {type : 'bookingstartedalert'}
        //     }
        //      fetch('https://exp.host/--/api/v2/push/send',{
        //         method : "POST",
        //         header : {
        //             "Accept" : "application/json",
        //             "Content-Type" : "application/json"
        //         },
        //         body : JSON.stringify(col)
        //     })
        //     })

            db.collection('users').doc(data.userid).get().then(alldatauser => {
                console.log(alldatauser.data());
                var tokenuser = alldatauser.data().notificationtoken;
                console.log("Token user is "+tokenuser);
                var coluser = {
                    to : tokenuser,
                    title : 'Booking Started',
                    body : 'Hi '+alldatauser.data().name+',Your booking has been started',
                    data : {type : 'bookingstartedalert',bookingid : change.id},
                    sound : 'default'
                }
                fetch('https://exp.host/--/api/v2/push/send',{
                    method : "POST",
                    header : {
                        "Accept" : "application/json",
                        "Content-Type" : "application/json"
                    },
                    body : JSON.stringify(coluser)
                })
            })
        
      }
      else if(data.allocatedpartner != "" && previousData.allocatedpartner == "") {
        // db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
        //     console.log(alldata.data());
        //     var token = alldata.data().notificationtoken;
        //     console.log("Token is "+token);
        //     var col = {
        //         to : token,
        //         title : 'Booking Started',
        //         body : 'Hi '+alldata.data().name+',Your booking has been started',
        //         data : {type : 'bookingstartedalert'}
        //     }
        //      fetch('https://exp.host/--/api/v2/push/send',{
        //         method : "POST",
        //         header : {
        //             "Accept" : "application/json",
        //             "Content-Type" : "application/json"
        //         },
        //         body : JSON.stringify(col)
        //     })
        //     })

            db.collection('users').doc(data.userid).get().then(alldatauser => {
                console.log(alldatauser.data());
                var tokenuser = alldatauser.data().notificationtoken;
                console.log("Token user is "+tokenuser);
                var coluser = {
                    to : tokenuser,
                    title : 'Partner Allocated',
                    body : 'Hi '+alldatauser.data().name+',our partner service expert has been allotted against your booking. Uzify service expert would get in touch with you soon.',
                    data : {type : 'bookingpartnerallocated',bookingid : change.id},
                    sound : 'default'
                }
                fetch('https://exp.host/--/api/v2/push/send',{
                    method : "POST",
                    header : {
                        "Accept" : "application/json",
                        "Content-Type" : "application/json"
                    },
                    body : JSON.stringify(coluser)
                })
            })
        
      }
      else if(data.allocatedpartner != "" && data.status == "completed" && previousData.status == "running") {
        // db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
        //     console.log(alldata.data());
        //     var token = alldata.data().notificationtoken;
        //     console.log("Token is "+token);
        //     var col = {
        //         to : token,
        //         title : 'Booking Completed',
        //         body : 'Hi '+alldata.data().name+',Your booking has been completed',
        //         data : {type : 'bookingstartedalert'}
        //     }
        //      fetch('https://exp.host/--/api/v2/push/send',{
        //         method : "POST",
        //         header : {
        //             "Accept" : "application/json",
        //             "Content-Type" : "application/json"
        //         },
        //         body : JSON.stringify(col)
        //     })
        // })

        db.collection('users').doc(data.userid).get().then(alldatauser => {
            console.log(alldatauser.data());
            var tokenuser = alldatauser.data().notificationtoken;
            console.log("Token user is "+tokenuser);
            var coluser = {
                to : tokenuser,
                title : 'Booking Completed',
                body : 'Hi '+alldatauser.data().name+',Your booking has been completed. Please provide feedback to serve you better experience in your next booking',
                data : {type : 'bookingcompletedfeedbackalert',bookingid : change.id},
                sound : 'default'
            }
            fetch('https://exp.host/--/api/v2/push/send',{
                method : "POST",
                header : {
                    "Accept" : "application/json",
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify(coluser)
            })
        })
    
      }
      else if(data.allocatedpartner != "" && data.status == "cancelledbypartner" && previousData.status == "pending") {
        db.collection('users').doc(data.userid).get().then(alldata => {
            console.log(alldata.data());
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Cancelled by Partner',
                body : 'Hi '+alldata.data().name+',Your booking id '+alldata.id+' has been cancelled by partner, Kindly Make a new booking',
                data : {type : 'bookingcancelledbypartneralert',bookingid : change.id},
                sound : 'default'
            }
            fetch('https://exp.host/--/api/v2/push/send',{
                method : "POST",
                header : {
                    "Accept" : "application/json",
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify(col)
            })
        })
      }

})


exports.sendPushNotification3 = functions.firestore.document('orders/{ordid}').onUpdate((change, context) => {

    const data = change.after.data();
      const previousData = change.before.data();
      console.log(data);
      console.log(data.allocatedpartner);
      console.log(data.status);
      console.log(previousData.status);
      if(data.allocatedpartner != "" && data.status == "running" && previousData.status == "pending") {
        db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
            console.log(alldata.data());
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Started',
                body : 'Hi '+alldata.data().name+',Your booking has been started',
                data : {type : 'bookingstartedalert',bookingid : change.id},
                sound : 'default'
            }
             fetch('https://exp.host/--/api/v2/push/send',{
                method : "POST",
                header : {
                    "Accept" : "application/json",
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify(col)
            })
            })

        
        
      }
      else if(data.allocatedpartner != "" && data.status == "completed" && previousData.status == "running") {
        db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
            console.log(alldata.data());
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Completed',
                body : 'Hi '+alldata.data().name+',Your booking has been completed',
                data : {type : 'bookingstartedalert',bookingid : change.id},
                sound : 'default'
            }
             fetch('https://exp.host/--/api/v2/push/send',{
                method : "POST",
                header : {
                    "Accept" : "application/json",
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify(col)
            })
        })


    
      }
      else if(data.allocatedpartner != "" && data.status == "cancelledbyuser" && previousData.status == "pending") {
        db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
            console.log(alldata.data());
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Cancelled by Customer',
                body : 'Hi '+alldata.data().name+',Your booking id '+alldata.id+' has been cancelled',
                data : {type : 'bookingcancelledbycustomeralert',bookingid : change.id},
                sound : 'default'
            }
            fetch('https://exp.host/--/api/v2/push/send',{
                method : "POST",
                header : {
                    "Accept" : "application/json",
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify(col)
            })
        })
      }
   
})

exports.sendPushNotification4 = functions.firestore.document('partners/{partnerid}').onUpdate((change, context) => {
    const id = change.after.id;
    const data = change.after.data();
      const previousData = change.before.data();
      console.log(id);
      
        db.collection('partners').doc(id).get().then(alldata => {
            console.log(alldata.data());
            var token = alldata.data().notificationtoken;
            var credits = Number(alldata.data().credits);
            console.log("Token is "+token);
            if(credits < 200) {
            var col = {
                to : token,
                title : 'Low Credits',
                body : 'Hi '+alldata.data().name+',You are running low on credits. Kindly recharge to accept bookings',
                data : {type : 'lowcreditsalert'},
                sound : 'default'
            }
             fetch('https://exp.host/--/api/v2/push/send',{
                method : "POST",
                header : {
                    "Accept" : "application/json",
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify(col)
            })
            }
            })
            

   
})



