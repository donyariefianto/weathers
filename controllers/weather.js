const moment = require('moment');
var parseString = require('xml2js');
const KODE_SBY = "501306"
const area = 'DigitalForecast-JawaTimur.xml'
const fs = require('fs');
const axios = require('axios');

exports.index = async (req, res) => {
    try{
        let tgl = req.query.tgl;
        if (!tgl) {
            tgl = moment().format('DD-MM-YYYY')
        }
        let validate_date = moment(tgl, 'DD-MM-YYYY',true).isValid();
        if (!validate_date) {
            return res.status(401).json({ message:'failed',data: 'date format invalid' });
        }
        
        let bmkg_earthquake2 = await axios({method: 'get',url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',headers: { }});
        let result = await axios({method: 'get',url: `http://202.90.198.212/logger/logfile/logARG-${tgl}.txt`,headers: { }});
        let bmkg_weather = await axios({method: 'get',url: `https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/${area}`,headers: { "Accept-Encoding": "gzip,deflate,compress" } });
        bmkg_earthquake2 = bmkg_earthquake2.data;
        result = result.data;
        bmkg_weather = bmkg_weather.data;
        bmkg_earthquake2.Infogempa.gempa['Shakemap']='https://data.bmkg.go.id/DataMKG/TEWS/'+bmkg_earthquake2.Infogempa.gempa['Shakemap']
        const Array = result.split("\r");
        var stw18 = Array.filter(function(data){
            return data.includes('STW1018;')
        });
        let data_txt,logger
        if (stw18[0]) {
            data_txt = ((stw18[stw18.length - 1]).replace('\n','')).split(';');
            logger = {
                "datetime":data_txt[1],
                "wind_speed":data_txt[2],
                "wind_direction_degree":data_txt[3],
                "temperature":data_txt[4],
                "rh":data_txt[5],
                "pressure_mbar":data_txt[6],
                "solar_radiasi":data_txt[7],
                "hujan":data_txt[8],
                "tegangan_baterai":data_txt[9],
                "temperature_logger":data_txt[10]
            }
        } else {
            data_txt=[]
            logger = {
                "datetime":'-',
                "wind_speed":'-',
                "wind_direction_degree":'-',
                "temperature":'-',
                "rh":'-',
                "pressure_mbar":'-',
                "solar_radiasi":'-',
                "hujan":'-',
                "tegangan_baterai":'-',
                "temperature_logger":'-'
            }
        }
        
        
        var xml2jsn,parameters=[],tr=[],vl=[],typ=[]
        parseString.parseString(bmkg_weather, (err, result) => {
        if (err) {
            throw err
        }
        const json = JSON.stringify(result, null, 4)
            xml2jsn = json
        });
        var cities = []
        var all_cities = JSON.parse(xml2jsn).data.forecast[0].area
        delete all_cities[all_cities.length-1]
        for (const allCity of all_cities) {
            if (allCity) {
                if (allCity.name[1]._.includes('Surabaya')||allCity.name[1]._.includes('Gresik')||allCity.name[1]._.includes('Bangkalan')||allCity.name[1]._.includes('Mojokerto')||allCity.name[1]._.includes('Sidoarjo')||allCity.name[1]._.includes('Lamongan')) {
                    console.log(allCity.name[1]._);
                    for (const i of allCity.parameter) {
                        for (const i2 of i.timerange) {
                            tr.push(i2.$.datetime)
                            vl.push(Number(i2.value[0]._))
                        }
                        typ.push(i.$.type)
                        parameters.push({
                            parameter:i.$.description,
                            datetime:tr,
                            value:vl,
                            type:typ,
                        })
                        vl = []
                        tr = []
                        typ=[]
                    }
                    cities.push({city:allCity.name[1]._,parameter:parameters})
                }
                parameters=[]
            }
        }
        
        var data_js = fs.readFileSync('./assets/data/data.txt', 'utf8');
        fs.writeFileSync("./assets/data/weather.js",`var data_all=${JSON.stringify({status:200,message:'success',timestamps:moment().unix(),data:{logger:logger,weather:cities,earthquake:bmkg_earthquake2.Infogempa.gempa}})};\n`+data_js);
        return res.status(200).json({status:200,message:'success',path:'/assets/data/weather.js'});
        // return res.status(200).json({status:200,message:'success',timestamps:moment().unix(),data:{logger:logger,weather:cities,earthquake:bmkg_earthquake2.Infogempa.gempa}})
    }catch(e){
        return res.status(500).json({status:500,message:e.message });
    }
};

exports.base = async (req, res) => {
    return res.render('page');
    return console.log(res.status(200).json({status:200,message:''}));
}; 