const moment = require('moment');
var parseString = require('xml2js');
const KODE_SBY = "501306"
const area = 'DigitalForecast-JawaTimur.xml'
const fs = require('fs');
const axios = require('axios');

exports.index = async (req, res) => {
    try{
        let tgl = req.params.tgl;
        let validate_date = moment(tgl, 'DD-MM-YYYY',true).isValid();
        if (!validate_date) {
            return res.status(401).json({ message:'failed',data: 'date format invalid' });
        }
        var get = {
            method: 'GET',
            redirect: 'follow',
            headers:{}
        };
        let bmkg_earthquake2 = await axios({method: 'get',url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',headers: { }});
        let result = await axios({method: 'get',url: `http://202.90.198.212/logger/log-${tgl}.txt`,headers: { }});
        let bmkg_weather = await axios({method: 'get',url: `https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/${area}`,headers: { }});
        bmkg_earthquake2 = bmkg_earthquake2.data;
        result = result.data;
        bmkg_weather = bmkg_weather.data;
        // let result = await fetch(`http://202.90.198.212/logger/log-${tgl}.txt`, get);
        // let bmkg_weather = await fetch(`https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/${area}`, get);
        // let bmkg_earthquake = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json`, get);
        // let bmkg_earthquake2 = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json`, get);
        // bmkg_weather = await bmkg_weather.text()
        // result = await result.text();
        // bmkg_earthquake = await bmkg_earthquake.json();
        // bmkg_earthquake2 = await bmkg_earthquake2.json();
        bmkg_earthquake2.Infogempa.gempa['Shakemap']='https://data.bmkg.go.id/DataMKG/TEWS/'+bmkg_earthquake2.Infogempa.gempa['Shakemap']
        const Array = result.split("\r");
        var stw18 = Array.filter(function(data){
            return data.includes('STW1018;')
        });
        let data_txt = ((stw18[stw18.length - 1]).replace('\n','')).split(';');
        
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
                parameters=[]
            }
        }

        const logger = {
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
        // fs.writeFileSync("./assets/data/foo.json", JSON.stringify({status:200,message:'success',timestamps:moment().unix(),data:{logger:logger,weather:cities,earthquake:{now:bmkg_earthquake2.Infogempa.gempa,update:bmkg_earthquake.Infogempa.gempa}}}));
        return res.status(200).json({status:200,message:'success',timestamps:moment().unix(),data:{logger:logger,weather:cities,earthquake:bmkg_earthquake2.Infogempa.gempa}})
        return res.status(200).json(
            {
                status:200,
                message:'success',
                timestamps:moment().unix(),
                path:'/assets/data/foo.json'
                // data:{logger:logger,weather:cities,earthquake:bmkg_earthquake.Infogempa.gempa}
            }
        );
    }catch(e){
        return res.status(500).json({status:500,message:e.message });
    }
};