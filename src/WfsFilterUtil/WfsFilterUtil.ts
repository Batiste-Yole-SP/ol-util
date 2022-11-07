import _isNil from 'lodash/isNil';
import { equalTo, like, or } from 'ol/format/filter';
import OlFormatFilter from 'ol/format/filter/Filter';
import OlFormatWFS, { WriteGetFeatureOptions } from 'ol/format/WFS';

export type AttributeDetails = {
  attributeName: string;
  type: 'number' | 'int' | 'string';
  exactSearch?: boolean;
  matchCase?: boolean;
};

export type SearchConfig = {
  featureNS: string;
  featureTypes?: string[];
  featurePrefix: string;
  geometryName?: string;
  maxFeatures?: number;
  outputFormat?: string;
  srsName?: string;
  wfsFormatOptions?: string;
  attributeDetails: AttributeDetails[];
};

/**
 * Helper class for building filters to be used with WFS GetFeature requests.
 *
 * @class WfsFilterUtil
 */
class WfsFilterUtil {

  /**
   * Creates a filter for a given feature type considering configured
   * search attributes, mapped features types to an array of attribute details and the
   * current search term.
   * Currently, supports EQUALTO and LIKE filters only, which can be combined with
   * OR filter if searchAttributes array contains multiple values though.
   *
   * @param {string} searchTerm Search value.
   * @param attributeDetails
   *   attributes that should be searched through.
   * @return {OlFormatFilter} Filter to be used with WFS GetFeature requests.
   * @private
   */
  static createWfsFilter(
    searchTerm: string,
    attributeDetails: AttributeDetails[]
  ): OlFormatFilter | null {
    if (attributeDetails.length === 0) {
      return null;
    }

    const propertyFilters = attributeDetails
      .filter(attribute => {
        const type = attribute.type;
        return !(type && (type === 'int' || type === 'number') && searchTerm.match(/[^.\d]/));
      })
      .map(attributeDetail => {
        if (attributeDetail.exactSearch) {
          return equalTo(attributeDetail.attributeName, searchTerm, attributeDetail.exactSearch);
        } else {
          return like(attributeDetail.attributeName,
            `*${searchTerm}*`, '*', '.', '!',
            attributeDetail.matchCase ?? false);
        }
      });
    if (Object.keys(propertyFilters).length > 1) {
      return or(...propertyFilters);
    } else {
      return propertyFilters[0];
    }
  }

  /**
   * Creates GetFeature request body for all provided featureTypes and
   * applies related filter encoding on it.
   *
   * @param {SearchConfig} searchConfig The search config
   * @param {string} searchTerm Search string to be used with filter.
   */
  static getCombinedRequests(searchConfig: SearchConfig, searchTerm: string): Element | undefined {
    const {
      featureNS,
      featurePrefix,
      featureTypes,
      geometryName,
      maxFeatures,
      outputFormat,
      srsName,
      attributeDetails
    } = searchConfig;

    const requests = featureTypes?.map((featureType: string): any => {
      const filter = WfsFilterUtil.createWfsFilter(searchTerm, attributeDetails);
      const propertyNames = attributeDetails.map(a => a.attributeName);
      const wfsFormatOpts: WriteGetFeatureOptions = {
        featureNS,
        featurePrefix,
        featureTypes,
        geometryName,
        maxFeatures,
        outputFormat,
        srsName,
        propertyNames
      };
      if (!_isNil(filter)) {
        wfsFormatOpts.filter = filter;
      }

      const wfsFormat: OlFormatWFS  = new OlFormatWFS(wfsFormatOpts);
      return wfsFormat.writeGetFeature(wfsFormatOpts);
    });

    if (_isNil(requests)) {
      return;
    }
    const request = requests[0] as Element;

    requests.forEach((req: any) => {
      if (req !== request) {
        const query = req.contains('Query');
        if (query !== null) {
          request.append(query);
        }
      }
    });

    return request;
  }
}

export default WfsFilterUtil;