import './style/app.scss';
import 'leaflet';

import * as points from './data/86T.json';
import GLMap from './gl-map';

const map = L.map('map').setView([36.0997445, -95.8438734], 8);
L.glify = new GLMap();

L.tileLayer("http://{s}.sm.mapstack.stamen.com/(toner-background,$fff[difference],$fff[@23],$fff[hsl-saturation@20],toner-lines[destination-in])/{z}/{x}/{y}.png")
    .addTo(map);

L.glify.images({
    map: map,
    click: function (e, point, xy) {
        //set up a standalone popup (use a popup as a layer)
        L.popup()
            .setLatLng(point)
            .setContent("You clicked the point at longitude:" + point[1] + ', latitude:' + point[0])
            .openOn(map);

        console.log(point);
        console.log(e);
        console.log(xy);
    },
    data: points.data.map(d => d.point),
    logos: points.data.map(d => d.logo)
});
