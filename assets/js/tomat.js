volumeCol = new Mongo.Collection('dataVolume');
volCount = new Mongo.Collection('counters');
dataStream = new Meteor.Stream('temphum');

//datatables
TabularTables = {};
Meteor.isClient && Template.registerHelper("TabularTables", TabularTables);

    TabularTables.DataVolume = new Tabular.Table({
      name: "volumeCol",
      collection: volumeCol,
      columns: [
        {data: "num", title: "No."},
        {data: "tem", title: "Temperature (°C)"},
        {data: "hum", title: "Humidity (%RH)"},
        {data: "vol", title: "Volume (mL)"},
        {data: "date", title: "Date"}
      ]
    });
//end of datatables

//client
if (Meteor.isClient) {


//dataVolume = Meteor.subscribe('dataVolume');
//console.log(dataVolume);
var datatem;
var datahum;
var datatime;

var volume=0; var calTem=0; var calHum=0; var calDate; var calTime;

  dataStream.on('te', function (hasil){
    var tem = hasil[0];
    var hum = hasil[1];
    var date = hasil[2];
    var time = hasil[3];
    var bat = hasil[4];
    datatem = tem;
    datahum = hum;
    datatime = time;
    $('#datatem').replaceWith('<h4><span id="datatem" class="label label-lg label-danger" value="'+tem+'">'+tem+' °C</span></h4>');
    $('#datahum').replaceWith('<h4><span id="datahum" class="label label-lg label-info" value="'+hum+'">'+hum+' %RH</span><h4>');
    $('#datadatetime').replaceWith('<div id="datadatetime">Retrieved : '+date+' @ '+time+'</div>');
    $('#databat').replaceWith('<div id="databat">Battery : '+bat+' %</div>');
  });


    //chart
   function builtChart() {

        $(document).ready(function() {
        Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
 
        var chart;
        $('#adminChartLevel').highcharts({
            chart: {
                type: 'spline',
                animation: Highcharts.svg, // don't animate in old IE
                marginRight: 10,
                events: {
                    load: function() {
 
                        // set up the updating of the chart each second
                        var series = this.series[0];
                        var series2 = this.series[1];
                        setInterval(function() {
                            var x = (new Date()).getTime(), // current time
                                y = datatem;
                                z = datahum;
                            series.addPoint([x, y], false, true);
                            series2.addPoint([x, z], true, true);
                        }, 15000);
                    }
                }
            },
            title: {
                text: 'Realtime Temperature and Humidity'
            },
            xAxis: {
                type: 'datetime',
                tickPixelInterval: 150
            },
            yAxis: [{
                title: {
                    text: 'Temperature'
                },
                plotLines: [{

                    value: 0,
                    width: 1,
                    color: '#CC3300'
                }]
            },
            {
                title: {
                    text: 'Humidity'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#00E6E6'
                }]
            }],
            tooltip: {
                formatter: function() {
                        return '<b>'+ this.series.name +'</b><br/>'+
                        Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) +'<br/>'+
                        Highcharts.numberFormat(this.y, 2);
                }
            },
            legend: {
                enabled: true
            },
            exporting: {
                enabled: false
            },
            series: [{
                name: 'Temperature (°C)',
                color: '#CC3300',
                data: (function() {
                    // generate an array of random data
                    var data = [],
                        time = (new Date()).getTime(),
                        i;
 
                    for (i = -9; i <= 0; i++) {
                        data.push({
                            x: time + i * 15000,
                            y: Math.random()  * (32 - 29) + 29
                        });
                    }
                    return data;
                })()
            },
                    {
                name: 'Humidity (%RH)',
                color: '#00E6E6',
                data: (function() {
                    // generate an array of random data
                    var data = [],
                        time = (new Date()).getTime(),
                        i;
 
                    for (i = -9; i <= 0; i++) {
                        data.push({
                            x: time + i * 15000,
                            y: Math.random() * (95 - 83) + 83
                        });
                    }
                    return data;
                })()
            }]
        });
    });
};


  Template.adminChartLevel.helpers({
   
  });

  Template.adminChartLevel.rendered = function() {    
      this.autorun(function (c) {
          builtChart();
      });
  };

    //end of chart


    //calculate volume
    Template.buttonHitung.events({
        'click .clickme': function(){
            volume = Math.round((calculateFuzzy(datatem, datahum))*50);
            $('#volume').replaceWith('<div id="volume"><h4>Volume Air = <span class="label label-success">'+volume+'mL</span></h4><small> pada Suhu '+datatem+'°C dan Kelembaban '+datahum+' %RH</small></div>');
            var curr = new Date();
            calDate = (curr.getFullYear())+"/"+("0"+(curr.getMonth()+1)).slice(-2)+"/"+("0"+curr.getDate()).slice(-2);
            calTime = ("0"+curr.getHours()).slice(-2)+":"+("0"+curr.getMinutes()).slice(-2)+":"+("0"+curr.getSeconds()).slice(-2);
            calTem = datatem;
            calHum = datahum;
        }
    });
  //end of calculate volume

  //save volume to database
    function getNextSequence(name) {
        var ret = volCount.findAndModify(
            {
                query: { _id: name },
                update: { $inc: { seq: 1 } },
                new: true
             }
        );
        return ret.seq;
    }

    Template.buttonSave.events({
        'click .save': function(){
            var test = parseInt(getNextSequence("userid").toString());
            console.log(test);
            var datetime = calDate+" , "+calTime;
            if(volumeCol.insert({
                num : test,
                tem : calTem,
                hum : calHum,
                vol : volume,
                date : datetime
            })){
                $('#successSaved').replaceWith('<div class="alert alert-success" id="successSaved"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a> <strong>Success!</strong> record saved</div>');
                delay(2000);
                $('#successSaved').replaceWith('<div id="successSaved"></div>');
            
            }
        }
    });
    //end of save volume to database


};


if(Meteor.isServer){
    Meteor.publish('dataVolume', function(){
        return dataVolume.find();
    });
  var serialPort = new SerialPort.SerialPort("/dev/ttyUSB0",{
    baudrate: 9600,
    parser: SerialPort.parsers.readline('\n')
  });

  serialPort.on('open', function(){
    console.log('Port Open');
  });

  serialPort.on('data', function(data){
    var str = data.split("#");
    var nilai_te = str[5].split(":");
    var nilai_hu = str[6].split(":");

    var nilai_bat = str[7].split(":");

    var tem = parseFloat(nilai_te[1]);
    var hum = parseFloat(nilai_hu[1]);
    var bat = parseFloat(nilai_bat[1]);

    var curr = new Date();
    var date = ("0"+curr.getDate()).slice(-2)+"/"+("0"+(curr.getMonth()+1)).slice(-2)+"/"+curr.getFullYear();
    var time = ("0"+curr.getHours()).slice(-2)+":"+("0"+curr.getMinutes()).slice(-2)+":"+("0"+curr.getSeconds()).slice(-2);

    if(!isNaN(tem) && !isNaN(hum) && !isNaN(bat)){
      var hasil=[];
      hasil[0] = {}; hasil[1]={};hasil[2]={};hasil[3]={};hasil[4]={};
      hasil[0] = tem;
      hasil[1] = hum;
      hasil[2] = date;
      hasil[3] = time;
      hasil[4] = bat;
      console.log('message', hasil);

      dataStream.emit('te', hasil);
    }

  });
};

