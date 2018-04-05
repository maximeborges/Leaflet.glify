import 'leaflet';

import './glify.js';
import './canvasoverlay.js';

import * as points from './data/86T.json';
import * as districts from './data/CZDistricts.json';

//node dependencies
import '../node_modules/earcut/src/earcut.js';
import '../node_modules/rbush/rbush.js';
import '../node_modules/point-in-polygon/index.js';


var map = L.map('map')
    .setView([50.00, 14.44], 8);

L.tileLayer("http://{s}.sm.mapstack.stamen.com/(toner-background,$fff[difference],$fff[@23],$fff[hsl-saturation@20],toner-lines[destination-in])/{z}/{x}/{y}.png")
    .addTo(map);

L.glify.shapes({
    map: map,
    click: function (e, feature) {
        L.popup()
            .setLatLng(e.latlng)
            .setContent("You clicked on " + feature.properties.NAZKR_ENG)
            .openOn(map);

        console.log(feature);
        console.log(e);
    },
    data: districts
});

L.glify.points({
    map: map,
    click: function (e, point, xy) {
        //set up a standalone popup (use a popup as a layer)
        L.popup()
            .setLatLng(point)
            .setContent("You clicked the point at longitude:" + point[L.glify.longitudeKey] + ', latitude:' + point[L.glify.latitudeKey])
            .openOn(map);

        console.log(point);
    },
    data: points.data
});
