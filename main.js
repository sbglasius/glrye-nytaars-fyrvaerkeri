import './style.css';
import Map from 'ol/Map';
import View from 'ol/View';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import {fromLonLat} from 'ol/proj';
import Feature from 'ol/Feature';
import {circular} from 'ol/geom/Polygon';
import {Fill, Stroke, Style} from 'ol/style';
import Overlay from 'ol/Overlay';

/* -------------------------------------------------------
   FORMAT LABEL (capitalization + æøå + spacing)
------------------------------------------------------- */
const formatLabel = (name) => {
    let fixed = name
        .replace(/ae/g, "æ")
        .replace(/oe/g, "ø")
        .replace(/aa/g, "å");

    const match = fixed.match(/^([a-zA-ZæøåÆØÅ]+)(\d.*)$/);
    if (!match) return fixed.charAt(0).toUpperCase() + fixed.slice(1);

    let street = match[1];
    let number = match[2];

    street = street.charAt(0).toUpperCase() + street.slice(1);
    return `${street} ${number}`;
};

/* -------------------------------------------------------
   BUILDING DATA WITH LABEL
------------------------------------------------------- */
const buildings = [
    {name: 'lyngdal', lon: 9.6985558, lat: 56.0747702},
    {name: 'ryesgade52', lon: 9.6972273, lat: 56.0730619},
    {name: 'hjarsbaekvej1b', lon: 9.6957261, lat: 56.0718605},
    {name: 'ryesgade2a', lon: 9.7020024, lat: 56.0772635},
    {name: 'ryesgade27', lon: 9.6987571, lat: 56.075438},
    {name: 'emborgvej23', lon: 9.701522, lat: 56.069309},
    {name: 'gyden7', lon: 9.6995346, lat: 56.0753341},
    {name: 'nyvej6', lon: 9.6999131, lat: 56.0777261},
    {name: 'nyvej7', lon: 9.6981424, lat: 56.0775614},
    {name: 'nyvej17', lon: 9.6994911, lat: 56.0782303},
    {name: 'skolebakken3', lon: 9.6971889, lat: 56.0753215},
    {name: 'skolebakken6', lon: 9.6968935, lat: 56.0750011},
    {name: 'engvej6', lon: 9.707735, lat: 56.060388},
    {name: 'storesand8', lon: 9.6970112, lat: 56.076045},
    {name: 'storesand10', lon: 9.696658, lat: 56.076606},
    {name: 'rimmersvej18', lon: 9.69538, lat: 56.06665},
    {name: 'hjarsbaekvej21', lon: 9.68512, lat: 56.06899},
    {name: 'praestegaardsvej10', lon: 9.702046, lat: 56.080448},
    {name: 'jaegergaardsvej9', lon: 9.700447, lat: 56.078247},
    {name: 'odderholm11', lon: 9.72486297, lat: 56.060836},
    {name: 'hejnaesvej3', lon: 9.7211302, lat: 56.0634333},
    {name: 'horsensvej21a', lon: 9.69613, lat: 56.069935}
].map(b => ({...b, label: formatLabel(b.name)}));

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */
const styles = {
    red: new Style({
        fill: new Fill({color: 'rgba(255,0,0,0.1)'}),
        stroke: new Stroke({color: 'rgba(255,0,0,0.1)', width: 2})
    }),
    blue: new Style({
        fill: new Fill({color: 'rgba(0,0,255,0.2)'}),
        stroke: new Stroke({color: 'rgba(0,0,255,0.2)', width: 2})
    }),
    hover: new Style({
        fill: new Fill({color: 'rgba(255,255,0,0.1)'}),
        stroke: new Stroke({color: 'yellow', width: 3})
    })
};

/* -------------------------------------------------------
   CREATE CIRCLE FEATURES
------------------------------------------------------- */
const makeCircle = (building, radius, colorName) => {
    const geom = circular([building.lon, building.lat], radius)
        .transform('EPSG:4326', 'EPSG:3857');

    const f = new Feature(geom);
    f.set('label', building.label);
    f.set('radius', radius);
    f.setStyle(styles[colorName]);
    return f;
};

const vectorSource = new VectorSource();
buildings.forEach(b => {
    vectorSource.addFeature(makeCircle(b, 400, 'red'));
    vectorSource.addFeature(makeCircle(b, 200, 'blue'));
});

const vectorLayer = new VectorLayer({source: vectorSource});

// Highlight layer (no flicker)
const highlightSource = new VectorSource();
const highlightLayer = new VectorLayer({
    source: highlightSource,
    style: styles.hover
});

/* -------------------------------------------------------
   MAP
------------------------------------------------------- */
const map = new Map({
    target: 'map',
    layers: [
        new TileLayer({source: new OSM()}),
        vectorLayer,
        highlightLayer
    ],
    view: new View({
        center: fromLonLat([9.6957261, 56.0718605]),
        zoom: 15
    })
});

/* -------------------------------------------------------
   TOOLTIP
------------------------------------------------------- */
const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
document.body.appendChild(tooltip);

const overlay = new Overlay({
    element: tooltip,
    offset: [10, 0],
    positioning: 'center-left'
});
map.addOverlay(overlay);

/* -------------------------------------------------------
   HOVER INTERACTION (MAP)
------------------------------------------------------- */
let highlighted = null;

map.on('pointermove', evt => {
    const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);

    if (feature !== highlighted) {
        if (highlighted) highlightSource.removeFeature(highlighted);

        if (feature) {
            highlightSource.addFeature(feature);
            tooltip.style.display = 'block';
            tooltip.innerHTML = feature.get('label');
            overlay.setPosition(evt.coordinate);
        } else {
            tooltip.style.display = 'none';
        }

        highlighted = feature;
    }
});

/* -------------------------------------------------------
   INFO BOX WITH ALL ADDRESSES
------------------------------------------------------- */
const infoBox = document.createElement('div');
infoBox.id = 'address-list';
document.body.appendChild(infoBox);
infoBox.innerHTML = `<strong>Adresser:</strong><br>` +
    buildings.map(b => `<div class="address-item">${b.label}</div>`).join('');

/* -------------------------------------------------------
   HOVER INTERACTION (INFO BOX)
------------------------------------------------------- */
const addressItems = document.querySelectorAll('.address-item');

addressItems.forEach((el, index) => {
    const building = buildings[index];
    el.addEventListener('mouseenter', () => {
        // Highlight both circles of this building
        highlightSource.clear();
        vectorSource.getFeatures().forEach(f => {
            if (f.get('label') === building.label) highlightSource.addFeature(f);
        });
    });
    el.addEventListener('mouseleave', () => {
        highlightSource.clear();
    });
});
