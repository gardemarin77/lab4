


mapboxgl.accessToken = 'pk.eyJ1IjoiZ2FyZGVtYXJpbjc3IiwiYSI6ImNta2VhaHhudTA1YjUzZXB3N2tlbnVuem4ifQ.Y50vLZNgH1HxQuFuhIFodA';

// Create the map and set its starting view
const map = new mapboxgl.Map({
    container: 'map',                          
    style: 'mapbox://styles/mapbox/dark-v11',  
    center: [-79.39, 43.65],                   
    zoom: 11                                  
});

// Add the zoom in/out buttons to the top-right corner of the map
map.addControl(new mapboxgl.NavigationControl());



// Create an empty variable to store the collision data once it loads
let collisionData;


fetch('https://raw.githubusercontent.com/gardemarin77/lab4/main/ggr472-lab4-main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json())  
    .then(data => {
        collisionData = data;          
    });

map.on('load', () => {


    // turf.bbox() calculates the geographic extent of the collision points
    // It returns an array: [minLng, minLat, maxLng, maxLat]
    let bbox = turf.bbox(collisionData);


    let bboxPolygon = turf.bboxPolygon(bbox);

    // Scale the rectangle up by 10% so hexagons cover the edges of the city too
    let scaledPolygon = turf.transformScale(bboxPolygon, 1.1);

    // Convert the scaled polygon back into a plain array for use in hexGrid()
    let scaledBbox = turf.bbox(scaledPolygon);

    
    let hexgrid = turf.hexGrid(scaledBbox, 0.5, { units: 'kilometers' });
    
    let collectedHex = turf.collect(hexgrid, collisionData, '_id', 'values');

    let maxCount = 0;

    collectedHex.features.forEach(feature => {

        // COUNT = how many collision IDs were collected inside this hexagon
        feature.properties.COUNT = feature.properties.values.length;

        // If this hexagon has more collisions than any previous one, update maxCount
        if (feature.properties.COUNT > maxCount) {
            maxCount = feature.properties.COUNT;
        }
    });

    map.addSource('collisions', {
        type: 'geojson',
        data: collisionData  
    });

    // Add a circle layer that draws each collision as a small yellow dot
    map.addLayer({
        id: 'collision-points',  
        type: 'circle',
        source: 'collisions',   
        paint: {
            'circle-radius': 2,
            'circle-color': '#ffcc00',   
            'circle-opacity': 0.6      
        }
    });



    // Register the hexgrid (with COUNT values) as a data source
    map.addSource('hexgrid', {
        type: 'geojson',
        data: collectedHex  
    });

    // Add a fill layer that colours each hexagon based on its COUNT value
    map.addLayer({
        id: 'hexgrid-fill',
        type: 'fill',
        source: 'hexgrid',
        filter: ['>', ['get', 'COUNT'], 0],  // Only show hexagons that have at least 1 collision
        paint: {
            'fill-color': [
                'interpolate', ['linear'], ['get', 'COUNT'],
                0,                           '#ffffb2', 
                Math.round(maxCount * 0.25), '#fd8d3c',  
                Math.round(maxCount * 0.5),  '#f03b20',  
                maxCount,                    '#bd0026'   
            ],
            'fill-opacity': 0.7  
        }
    });

    // Add a thin white outline around each hexagon so they are visually separated
    map.addLayer({
        id: 'hexgrid-line',
        type: 'line',
        source: 'hexgrid',  
        paint: {
            'line-color': '#ffffff',
            'line-width': 0.3,
            'line-opacity': 0.3
        }
    });




    // When the user clicks a hexagon, show a popup with the collision count
    map.on('click', 'hexgrid-fill', (e) => {

        // Read the COUNT value from the hexagon that was clicked
        let count = e.features[0].properties.COUNT;

        // Create and display the popup at the click location
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)                          
            .setHTML('<b>Collisions:</b> ' + count)       
            .addTo(map);
    });



    document.getElementById('toggle-points').addEventListener('change', (e) => {

        // If the checkbox is checked, show the layer; if unchecked, hide it
        let visibility = e.target.checked ? 'visible' : 'none';

        // Apply the visibility setting to the collision-points layer
        map.setLayoutProperty('collision-points', 'visibility', visibility);
    });

}); 