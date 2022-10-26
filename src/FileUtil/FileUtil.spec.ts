/* eslint-env jest*/

import OlMap from 'ol/Map';
import shpwrite from 'shp-write';

import geoJson from '../../assets/federal-states-ger.json';
import {
  FileUtil
} from '../index';
import TestUtil from '../TestUtil';


const geoJson2 = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [47, -11]
    },
    properties: {
      song: 'If you have ghosts'
    }
  }]
};

describe('FileUtil', () => {
  const geoJsonFile = new File([JSON.stringify(geoJson)], 'geo.json', {
    type: 'application/json',
    lastModified: new Date().getMilliseconds()
  });

  const shpBuffer = shpwrite.zip(geoJson2);
  const shpFile = new File([new Blob([shpBuffer])], 'geo.zip', {
    type: 'application/zip',
    lastModified: new Date().getMilliseconds()
  });

  let map: OlMap;

  it('is defined', () => {
    expect(FileUtil).not.toBeUndefined();
  });

  describe('Static methods', () => {
    beforeEach(() => {
      map = TestUtil.createMap();
    });

    afterEach(() => {
      TestUtil.removeMap(map);
    });

    describe('#addGeojsonLayer', () => {
      it('adds a layer from a geojson string', () => {
        expect.assertions(2);
        return new Promise((resolve) => {
          const layers = map.getLayers();
          layers.on('add', (event) => {
            const layer = event.element;
            expect(layers.getLength()).toBe(2);
            expect(layer.getSource().getFeatures().length).toBe(16);
            resolve(true);
          });
          FileUtil.addGeojsonLayer(JSON.stringify(geoJson), map);
        });
      });
    });

    describe('#addGeojsonLayerFromFile', () => {
      it('reads the geojson file and adds a layer to the map', () => {
        expect.assertions(2);
        return new Promise((resolve) => {
          const layers = map.getLayers();
          layers.on('add', (event) => {
            const layer = event.element;
            expect(layers.getLength()).toBe(2);
            expect(layer.getSource().getFeatures().length).toBe(16);
            resolve(true);
          });
          FileUtil.addGeojsonLayerFromFile(geoJsonFile, map);
        });
      });
    });

    describe('#addShpLayerFromFile', () => {
      it('reads the shp file and adds a layer to the map', () => {
        expect.assertions(6);
        return new Promise((resolve) => {
          const layers = map.getLayers();
          layers.on('add', (event) => {
            const layer = event.element;
            expect(layers.getLength()).toBe(2);

            var features = layer.getSource().getFeatures();
            expect(features.length).toBe(1);
            var feat = features[0];
            var coords = feat.getGeometry().getCoordinates();
            var properties = feat.getProperties();

            expect(coords[0]).toBe(47);
            expect(coords[1]).toBe(-11);
            expect('song' in properties).toBe(true);
            expect(properties.song).toBe('If you have ghosts');
            resolve(true);
          });
          FileUtil.addShpLayerFromFile(shpFile, map);
        });
      });
    });

  });
});
