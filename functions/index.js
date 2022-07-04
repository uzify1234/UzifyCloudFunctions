const functions = require("firebase-functions");
var fetch = require('node-fetch');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const schedule = require('node-schedule');
const cron = require('node-cron');
const axios = require('axios');
var sha512 = require('js-sha512');


const runtimeOpts = {
    timeoutSeconds: 540
  };


  exports.dataclear1 = functions.runWith(runtimeOpts).pubsub.schedule("00 6 * * *").timeZone('Asia/Kolkata').onRun((context) => {
    console.log("Data clear 1 called");
    return db.collection('orders').where('status','==','pending').where('assignedpartner','==','').get().then(allbooks => {
        var allbooksholder = [];
        var allproms = [];
        allbooks.docs.map(eachbook => {
            console.log(eachbook.id);
            allbooksholder.push({id : eachbook.id,data : eachbook.data()});
            allproms.push(sendleeds(eachbook.id,eachbook.data()));
        })
        handlemiddlething(allbooksholder);
    }).catch(erf => {
        console.log(erf);
    })

  });


  const handlemiddlething = async (wholearray) => {
    wholearray.map(eachmap => {
        sendleeds(eachmap.id,eachmap.data);
    })
}

const handleepocdate = (selecteddate,selectedtimeslot) =>
{
  var septimeslot = selectedtimeslot.split(" ");
  var sstl = Number(septimeslot[0]);
  if(septimeslot[1] == "PM") {
      sstl = sstl + 12;
  }
  var generatingstring = selecteddate+' '+sstl+':00:00';
//   console.log(generatingstring);
  var date = new Date(...getParsedDate(generatingstring));
  var modifieddate = date ;
//   console.log("M "+modifieddate);
  var hold = (Math.round((date).getTime() / 1000)) + (5.5 * 60 * 60);
//   console.log(hold+" Hold");
  return hold;
  
}
function getParsedDate(date){
    date = String(date).split(' ');
    var days = String(date[0]).split('-');
    var hours = String(date[1]).split(':');
    return [parseInt(days[0]), parseInt(days[1])-1, parseInt(days[2]), parseInt(hours[0]), parseInt(hours[1]), parseInt(hours[2])];
  }



const sendleeds = (bookid,data) => {


    return new Promise((resolvewhole,rejectwhole) => {
        var round1eligible = [];
        var starttimeepoc = handleepocdate(data.selecteddate , data.selectedtimeslot);
          
         var totaltime = 0;  
        data.cart.map(eachcart => {
               totaltime = totaltime + (Number(eachcart.servicetime) * Number(eachcart.displaycount));
           })
           if(data.freeitem != null ) {
               totaltime = totaltime + Number(data.freeitem.servicetime);
           }
           if(totaltime < 2 * 60) {
               totaltime = 120;
           }
           var endtimeepoc = starttimeepoc + (totaltime * 60);
            db.collection('partners').where('credits','>=' ,data.mincredits).where('adminaccepted','==',true).where('isactive','==',true).where('selectedpincodesarray','array-contains',data.personpincode).get().then(df => {
            var allproms = [];
            df.forEach((doc) => {
                var prom1 = new Promise((resolve,reject) => {
                    db.collection('partners').doc(doc.id).collection('worktime').get().then(allwt => {
                        var evenfound = true;
                        if(allwt.docs.length == 0)
                        {
                            resolve({id : doc.id,data : doc.data()});
    
                        }
                        allwt.docs.map(eachdoct => {
                  
                            if((starttimeepoc >= eachdoct.data().start && starttimeepoc <= eachdoct.data().end) || (endtimeepoc >= eachdoct.data().start && endtimeepoc <= eachdoct.data().end))
                            {
                                evenfound = false;
                                resolve({id : 'none',data : {}});
                            }
             
                        })
                        if(evenfound == true) {
                            resolve({id : doc.id,data : doc.data()});
                        }
                    })
    
                })
                allproms.push(prom1);
            })
            Promise.all(allproms).then(finst => {
                if(finst != 'none') {
                    console.log("Partner Eligible "+finst.id);
                    if(finst.length > 0) {
                    var alleligiblepartners = [];
                    var allproms2 = [];
                    finst.map(eachfinst => {
                        var partid = eachfinst.id;
                        if(partid != undefined) {
                        var prom2 = new Promise((resolve,reject) => {
                            db.collection('partners').doc(partid).collection('leavetime').get().then(allwt2 => {
                                var evenfound = true;
                                allwt2.docs.map(eachdoct => {
                                    if((starttimeepoc >= eachdoct.data().start && starttimeepoc <= eachdoct.data().end) || (endtimeepoc >= eachdoct.data().start && endtimeepoc <= eachdoct.data().end))
                                    {
                                        console.log("Partner "+partid+"  is on leave");
                                        evenfound = false;
                                        resolve('none');
                                    }
                                }) 
                                if(evenfound) {
                                    alleligiblepartners.push(eachfinst);
                                    resolve(partid);
                                }
                            })
                        })
                        allproms2.push(prom2);
                        }
                    })
                    Promise.all(allproms2).then(fgh => {
                        var sorteddata = alleligiblepartners.filter(ef => ef.id != 'none');
                        var randomorderid = bookid;
                        console.log("Found Eligible Partners");
                        console.log(alleligiblepartners);
                        var today = Math.round((new Date()).getTime() / 1000);
                        console.log("Today is "+today);
                        today = today + (5.5 * 60 * 60 );
                        var gap1 = (Number(today)+(15 * 60))
                        var gap2 = (Number(gap1)+(10 * 60))
                        var gap3 = (Number(gap2)+(10 * 60))
                        var gap4 = (Number(gap3)+(10 * 60))
                        var gap5 = (Number(gap4)+(10 * 60))
                        var mincredits = data.mincredits;
    
    
                        var attemptedpartners = [];
                        if(sorteddata.length > 0) {
                            attemptedpartners.push({id : sorteddata[0].id , priority : 1,start : today,end : gap1});
                        }
                        if(sorteddata.length > 1) {
                            attemptedpartners.push({id : sorteddata[1].id , priority : 2,start : gap1,end : gap2});
                        }
                        if(sorteddata.length > 2) {
                            attemptedpartners.push({id : sorteddata[2].id , priority : 3,start : gap2,end : gap3});
                        }
                        if(sorteddata.length > 3) {
                            attemptedpartners.push({id : sorteddata[3].id , priority : 4,start : gap3,end : gap4});
                        }
                        if(sorteddata.length > 4) {
                            attemptedpartners.push({id : sorteddata[4].id , priority : 5,start : gap4,end : gap5});
                        }
                        db.collection('orders').doc(bookid).update({
                            attemptedpartners : attemptedpartners
                        });
                
                        if(sorteddata.length > 0) {
                            db.collection('partners').doc(sorteddata[0].id).collection('bookingsonqueue').doc(randomorderid).set({
                                startshowtime : today,
                                endshowtime : gap1,
                                mincredits : mincredits,
                                userid : sorteddata[0].id
                            }).then(dd => {
                                console.log(sorteddata[0].id);
                                if(sorteddata.length > 1) {
                                    db.collection('partners').doc(sorteddata[1].id).collection('bookingsonqueue').doc(randomorderid).set({
                                        startshowtime : gap1,
                                        endshowtime : gap2,
                                        mincredits : mincredits,
                                        userid : sorteddata[1].id
                                    }).then(dd2 => {
                                        if(sorteddata.length > 2) {
                                            db.collection('partners').doc(sorteddata[2].id).collection('bookingsonqueue').doc(randomorderid).set({
                                                startshowtime : gap2,
                                                endshowtime : gap3,
                                                mincredits : mincredits,
                                                userid : sorteddata[2].id
                                            }).then(dd3 => {
                                                if(sorteddata.length > 3) {
                                                    db.collection('partners').doc(sorteddata[3].id).collection('bookingsonqueue').doc(randomorderid).set({
                                                        startshowtime : gap3,
                                                        endshowtime : gap4,
                                                        mincredits : mincredits,
                                                        userid : sorteddata[3].id
                                                    }).then(dd => {
                                                        if(sorteddata.length > 4) {
                                                            db.collection('partners').doc(sorteddata[4].id).collection('bookingsonqueue').doc(randomorderid).set({
                                                                startshowtime : gap4,
                                                                endshowtime : gap5,
                                                                mincredits : mincredits,
                                                                userid : sorteddata[4].id
                                                            }).then(dd => {
                                                                resolvewhole("done");
                                                            }).catch(err => {
                                                                reject(err);
                                                            })
                                                        }
                                                        else {
                                                            resolvewhole("done");
                                                        }
                                                    }).catch(err => {
                                                        reject(err);
                                                    })
                                                }
                                                else {
                                                    resolvewhole("done");
                                                }
                                            }).catch(err3 => {
                                                reject(err3);
                                            })
                                        }
                                        else {
                                            resolvewhole("done");
                                        }
                                    }).catch(err2 => {
                                        reject(err2);
                                    })
                                }
                                else {
                                    resolvewhole("done");
                                }
                            }).catch(err => {
                                reject(err);
                            })
                        }
    
                    })
    
                    }
                }
            })
        })
    })



};

  exports.dataclear2 = functions.runWith(runtimeOpts).pubsub.schedule("30 6 * * *").timeZone('Asia/Kolkata').onRun((context) => {
    console.log("Data clear 2 called");
    var allproms = [];
    return db.collection('partners').get().then(allpartners => {
        allpartners.docs.map(eachpartner => {
            let partid = eachpartner.id;
            var prom1 = new Promise((resolve,reject) => {
                var currenttime = Math.round((new Date()).getTime() / 1000);
                db.collection('partners').doc(partid).collection('bookingsonqueue').where('endshowtime','<=',currenttime).get().then(allbsqu => {
                    allbsqu.docs.map(eachbque => {
                        eachbque.ref.delete();
                    })
                    db.collection('partners').doc(partid).collection('worktime').where('end','<=',currenttime).get().then(allbsqu2 => {
                        allbsqu2.docs.map(eachbque => {
                            eachbque.ref.delete();
                        })
                        db.collection('partners').doc(partid).collection('leavetime').where('end','<=',currenttime).get().then(allbsqu3 => {
                            allbsqu3.docs.map(eachbque => {
                                eachbque.ref.delete();
                            })
                            db.collection('orders').where('endtimeepoc','<=',currenttime).where('status','==','pending').get().then(allorders => {
                                allorders.docs.map(eachord => {
                                    eachord.ref.update({status : 'expired'});
                                })
                                db.collection('partners').doc(partid).collection('upcomingbookings').where('end','<=',currenttime).get().then(allbsqu4 => {
                                    var allotherproms = [];

                                    allbsqu4.docs.map(eachbque => {
                                        var otherprom = new Promise((resolve,reject) => {
                                            db.collection('partners').doc(partid).collection('pastbookings').doc(eachbque.id).set({
                                                completed : true
                                            }).then(dd => {
                                                eachbque.ref.delete();
                                            })
                                        })
                                        allotherproms.push(otherprom);
                                       
                                    })
                                    Promise.all(allotherproms).then(dff => {
                                        resolve(partid);
                                    })
                                })

                                
                            })
                            
                        })
                    }).catch(erf => {
                        console.log(erf);
                    })
                })
            })
         
            allproms.push(prom1);
        })

        Promise.all(allproms).then(res => {
            console.log("Data clear 2 done calling");
        })
    }).catch(err => {
        console.log(err);
    })

  });

exports.sendPushNotificationforrefundsauto = functions.runWith(runtimeOpts).pubsub.schedule("30 7 * * *").timeZone('Asia/Kolkata').onRun((context) => {
    var today = Math.round((new Date()).getTime() / 1000);
    var allproms = [];

    return db.collection('orders').where('status','==','pending').where('starttimeepoc','<',today).where('selectedpaymentmode','==','Online Prepaid').get().then(allord => {
        allord.docs.map(eachord => {
            if(eachord.data().refundinitiated == true) {
                
            }
            else {
                console.log("Need refund for "+eachord.id);
                var np = new Promise((resolve,reject) => {
                    db.collection('userorderstransactions').doc(eachord.data().transactionid).get().then(transinfo => {
                        // var url = 'https://www.payumoney.com/treasury/merchant/refundPayment?merchantKey='+'eXzZaR'+'&paymentId='+transinfo.data().mihpayid+'&refundAmount=1';
                        var url = 'https://www.payumoney.com/treasury/merchant/refundPayment';
                        console.log("Refund Function at 6:30 ");
                        var xtrans = {... transinfo.data(),refundinitiated : false,refundentryaddedon : today,refunded : false,refundattemptcount : 0};
                        db.collection('needrefunds').doc(eachord.data().transactionid).set(xtrans).then(hg => {

                        }).catch(erf => {

                        })
                        // const data = {
                        //     merchantKey: 'eXzZaR',
                        //         paymentId: transinfo.data().mihpayid,
                        //         refundAmount : 1
                        // }

                        // const header = {
                        //     "Access-Control-Allow-Origin": "*",
                        //     "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
                        //     "Content-Type": "application/json"
                        // }


                    

                        // axios({
                        //     method: 'post',
                        //     url: url,
                        //     data: data,
                        //     headers: header
                        // })
                        // .then((res)=>{resolve(res);})
                        // .catch((err)=>{reject(err);})
                      

          
                    })
                })
                allproms.push(np);

            }
            
        })
        Promise.all(allproms).then(dd => {
            console.log("Done Got");
            // console.log(dd);
            return "Done";
        }).catch(ee => {
            console.log("Error Got");
            // console.log(ee);
            return "fail";
        })
    })

});


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
                        body : 'Hi '+alldatauser.data().firstname+',You have an upcoming booking on '+date_obj.toLocaleString(),
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


exports.sendPushNotification = functions.firestore.document('orders/{ordid}').onUpdate((change,context) => {
    var beforeallavailpartners = change.before.data();
        var allavailpartners = change.after.data();

        if(allavailpartners.assignedpartner != '' && beforeallavailpartners.assignedpartner != '' && beforeallavailpartners.assignedpartner != allavailpartners.assignedpartner) {
            return db.collection('partners').doc(allavailpartners.assignedpartner).get().then(alldata => {
                var token = alldata.data().notificationtoken;
                console.log("Token is "+token);
                var col = {
                    to : token,
                    title : 'New Booking Assigned',
                    body : 'Hi '+alldata.data().name+',You have been assigned a new booking',
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
            });
        }
        
        if(allavailpartners.attemptedpartners != undefined && allavailpartners.attemptedpartners != beforeallavailpartners.attemptedpartners) {
        allavailpartners.attemptedpartners.forEach(availpartner => {
            console.log("Partner check "+availpartner.id);
            if(availpartner.id != undefined) {
                return db.collection('partners').doc(availpartner.id).get().then(alldata => {
                    var token = alldata.data().notificationtoken;
                    console.log("Token is "+token);



                    var date_obj = new Date((availpartner.start * 1000)+(2 * 60 * 1000));
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
                          db.collection('orders').doc(change.id).get().then(orddet => {
                              if(orddet.data().status == 'pending' && orderdet.data().assignedpartner == '') {
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
                              }
                
                          })
                      });
                })
                }
        })
    }

   


    
})


exports.sendPushNotification2 = functions.firestore.document('orders/{ordid}').onUpdate((change, context) => {

    const data = change.after.data();
      const previousData = change.before.data();

      if(data.allocatedpartner != "" && data.status == "running" && previousData.status == "pending") {


           return db.collection('users').doc(data.userid).get().then(alldatauser => {
                var tokenuser = alldatauser.data().notificationtoken;
                console.log("Token user is "+tokenuser);
                var coluser = {
                    to : tokenuser,
                    title : 'Booking Started',
                    body : 'Hi '+alldatauser.data().firstname+',Your booking has been started',
                    data : {type : 'bookingstartedalert',bookingid : change.after.data().orderid},
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


        return db.collection('users').doc(data.userid).get().then(alldatauser => {
                var tokenuser = alldatauser.data().notificationtoken;
                console.log("Token user is "+tokenuser);
                var coluser = {
                    to : tokenuser,
                    title : 'Partner Allocated',
                    body : 'Hi '+alldatauser.data().firstname+',our partner service expert has been allotted against your booking. Uzify service expert would get in touch with you soon.',
                    data : {type : 'bookingpartnerallocated',bookingid :change.after.data().orderid},
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


        return db.collection('users').doc(data.userid).get().then(alldatauser => {
            var tokenuser = alldatauser.data().notificationtoken;
            console.log("Token user is "+tokenuser);
            console.log(data.selectedpaymentmode);
            console.log(data.assignedpartner);
            console.log(previousData.orderid);
            if(data.selectedpaymentmode == "Online Prepaid" && data.assignedpartner != '') {
                db.collection('partnerpayouts').doc(previousData.orderid).set({
                    payoutto : data.assignedpartner,
                    payoutamount : data.netamount,
                    paidbyuser : data.userid,
                    transactionid : data.transactionid,
                    addedon : Math.round((new Date()).getTime() / 1000),
                    status : 'unpaid'
                }).then(yeah => {

                })
            }
            var coluser = {
                to : tokenuser,
                title : 'Booking Completed',
                body : 'Hi '+alldatauser.data().firstname+',Your booking has been completed. Please provide feedback to serve you better experience in your next booking',
                data : {type : 'bookingcompletedfeedbackalert',bookingid : change.after.data().orderid},
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
        return db.collection('users').doc(data.userid).get().then(alldata => {
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Cancelled by Partner',
                body : 'Hi '+alldata.data().firstname+',Your booking id '+alldata.id+' has been cancelled by partner, Kindly Make a new booking',
                data : {type : 'bookingcancelledbypartneralert',bookingid : change.after.data().orderid},
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
    
      console.log(previousData.status + " changing into "+data.status);
      if(data.allocatedpartner != "" && data.status == "running" && previousData.status == "pending") {
        return db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Started',
                body : 'Hi '+alldata.data().name+',Your booking has been started',
                data : {type : 'bookingstartedalert',bookingid : change.after.data().orderid},
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
        return db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Completed',
                body : 'Hi '+alldata.data().name+',Your booking has been completed',
                data : {type : 'bookingstartedalert',bookingid : change.after.data().orderid},
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
        return db.collection('partners').doc(data.allocatedpartner).get().then(alldata => {
            var token = alldata.data().notificationtoken;
            console.log("Token is "+token);
            var col = {
                to : token,
                title : 'Booking Cancelled by Customer',
                body : 'Hi '+alldata.data().name+',Your booking id '+alldata.id+' has been cancelled',
                data : {type : 'bookingcancelledbycustomeralert',bookingid : change.after.data().orderid},
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

      if(previousData.adminaccepted == false && data.adminaccepted == true) {
          console.log("False to True");
          console.log(data.notificationtoken);
          var ttk = data.notificationtoken;
          var col = {
            to : ttk,
            title : 'Profile Approved',
            body : 'Hi '+data.name+',Your profile has been approved, Recharge your credits to start getting leads',
            data : {type : 'profileapproved'},
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

      if(data.error != previousData.error && data.adminaccepted == false) {
        var ttk = data.notificationtoken;
        var col = {
          to : ttk,
          title : 'Profile Approved',
          body : 'Hi '+data.name+',You have some rectification requested by admin in your profile. Kindly rectify it to get your profile accepted',
          data : {type : 'profileapproved'},
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
      
        db.collection('partners').doc(id).get().then(alldata => {
            var token = alldata.data().notificationtoken;
            var credits = Number(alldata.data().credits);
            console.log("Token is "+token);
            if(credits < 200 && alldata.data().isactive == true) {
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


exports.sendnotificationstocustomusers = functions.runWith(runtimeOpts).https.onRequest((req, res) => {
    console.log("CUSTOM");
    
    var needed = req.query.tokens.substring(1, req.query.tokens.length-1);

    var notifrec = req.query.tokens.split(",");
    var title = req.query.title;
    var body = req.query.body;
    var allcols = [];
    var eas = [];
    notifrec.map(eachuser => {
     eas.push(eachuser);
    })
    var col = {
        to : eas,
        title : title,
        body : body,
        data : {type : 'adminsent'},
        sound : 'default'
    }
    allcols.push(JSON.stringify(col));

    return fetch('https://exp.host/--/api/v2/push/send',{
        method : "POST",
        header : {
            "Accept" : "application/json",
            "Content-Type" : "application/json"
        },
        body : [JSON.stringify(col)]
    }).then(done => {
        res.send("Done");
    }).catch(err => {
        console.log(err);
        res.send(err);
    })
  });



exports.sendrefundforthispayment = functions.runWith(runtimeOpts).https.onRequest((req, res) => {
    console.log("CUSTOM");
    
  

    db.collection('needrefunds').where('refunded','==',false).where('refundattemptcount','<=',3).get().then(allrs => {
        console.log(allrs.docs.length);
        var allproms = [];
        allrs.docs.map(eachrs => {
            
            var needed = eachrs.data().mihpayid;
            var ogcount = eachrs.data().refundattemptcount;
            var prom = new Promise((resolve,reject) => {
                console.log(eachrs.data());
                var url = 'https://info.payu.in/merchant/postservice.php?form=2';
    

                var message = "eXzZaR|cancel_refund_transaction|"+needed+"|Jjw7ra3BdXgVvYAgtlYo6aGJX34ETVFM";
                var hash = sha512(message);
                console.log("Hash is "+hash);
                const data = {
                    key: 'eXzZaR',
                    command : 'cancel_refund_transaction',
                    var1: needed,
                    var2 : 'xydggsgfgs',
                    var3 : 1,
                    hash : hash
                }
            

                var amo = parseFloat(eachrs.data().amount).toString();
                console.log("Amount is "+amo);
                const params = new URLSearchParams()
            params.append('key', 'eXzZaR')
            params.append('command', 'cancel_refund_transaction')
            params.append('var1', needed)
            params.append('var2', eachrs.data().txnid+""+eachrs.data().transactiondone);
            params.append('var3', amo)
            params.append('hash', hash)
                const  header = {
                    "accept" : "application/json",
                    "Content-Type" : "application/x-www-form-urlencoded"
                }
                console.log(url);

            
            
                   axios({
                    method: 'post',
                    url: url,
                    data: params,
                    headers : header
                  }).then(function (response) {
                      console.log(response.data.error_code+" "+needed+" "+ogcount);
                      if(response.data.error_code == 102 || response.data.error_code == 102) {
                        db.collection('needrefunds').doc(eachrs.id).update({refunded : true}).then(he => {
                            resolve(eachrs);
                        })
                      }
                      else {
                        db.collection('needrefunds').doc(eachrs.id).update({refundattemptcount : (ogcount + 1)}).then(he => {
                            resolve(eachrs);
                        })
                      }
                  });
            })
            allproms.push(prom);
        })
        Promise.all(allproms).then(sse => {

        })
    })

    
    // fetch(url,{
    //     method : "POST",
    //     header : header,
    //     body : data
    // }).then(done => {
    //     console.log("Done");
    //     console.log(done);
    // }).catch(err => {
    //     console.log("Error");
    //     console.log(err);
    // })


  });