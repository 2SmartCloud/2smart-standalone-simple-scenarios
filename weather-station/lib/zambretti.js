/* eslint-disable no-param-reassign,no-magic-numbers,dot-notation */
let Trend;

// eslint-disable-next-line no-shadow
(function (Trend) {
    Trend[Trend.Steady = 0] = 'Steady';
    Trend[Trend.Rising = 1] = 'Rising';
    Trend[Trend.Falling = 2] = 'Falling';
}(Trend || (Trend = {})));

const AVG_COMPASS_POINTS_AZIMUTHS_TO_CORRELATION_VALUES = {
    '0'     : -1,
    '22.5'  : -0.75,
    '45'    : -0.5,
    '67.5'  : -0.25,
    '90'    : 0,
    '112.5' : 0.5,
    '135'   : 1,
    '157.5' : 1.5,
    '180'   : 2,
    '202.5' : 1.5,
    '225'   : 1,
    '247.5' : 0.5,
    '270'   : 0,
    '292.5' : -0.25,
    '315'   : -0.5,
    '337.5' : -0.75
};

const FORECAST = {
    'A' : 'Settled fine',
    'B' : 'Fine weather',
    'C' : 'Becoming fine',
    'D' : 'Fine, becoming less settled',
    'E' : 'Fine, possible showers',
    'F' : 'Fairly fine, improving',
    'G' : 'Fairly fine, possible showers early',
    'H' : 'Fairly fine, showery later',
    'I' : 'Showery early, improving',
    'J' : 'Changeable, mending',
    'K' : 'Fairly fine, showers likely',
    'L' : 'Rather unsettled clearing later',
    'M' : 'Unsettled, probably improving',
    'N' : 'Showery, bright intervals',
    'O' : 'Showery, becoming less settled',
    'P' : 'Changeable, some rain',
    'Q' : 'Unsettled, short fine intervals',
    'R' : 'Unsettled, rain later',
    'S' : 'Unsettled, some rain',
    'T' : 'Mostly very unsettled',
    'U' : 'Occasional rain, worsening',
    'V' : 'Rain at times, very unsettled',
    'W' : 'Rain at frequent intervals',
    'X' : 'Rain, very unsettled',
    'Y' : 'Stormy, may improve',
    'Z' : 'Stormy, much rain'
};

// algorithm details: http://monatkodenis.blogspot.com/2016/09/zambretti-3.html
function calculateForecast(pressure, trend, month, currWindDirection) {
    // eslint-disable-next-line no-nested-ternary
    let z = trend === Trend.Falling ?
        130 - (pressure / 8.1) :
        trend === Trend.Steady ?
            147 - (5 * pressure / 37.6) :
            179 - (2 * pressure / 12.9);

    const correlationByWindDirection = Object.keys(AVG_COMPASS_POINTS_AZIMUTHS_TO_CORRELATION_VALUES)
        .reduce((acc, windDirection) => {
            const currDiff = Math.abs(+windDirection - currWindDirection);

            if (currDiff < acc.minDiff) {
                acc.value = AVG_COMPASS_POINTS_AZIMUTHS_TO_CORRELATION_VALUES[windDirection];
                acc.minDiff = currDiff;
            }

            return acc;
        }, { value: 0, minDiff: currWindDirection }).value;

    z += correlationByWindDirection;

    const isSummer = month >= 4 && month <= 9;

    if (trend === Trend.Rising) {
        z -= isSummer ? 2 : 1;
    } else if (trend === Trend.Falling) {
        z += isSummer ? 2 : 1;
    }

    z = Math.round(z);

    if (trend === Trend.Falling) {
        if (z < 1) {
            return FORECAST['A'];
        }

        if (z > 9) {
            return FORECAST['X'];
        }

        const fallingTrendForecast = {
            1 : FORECAST['A'],
            2 : FORECAST['B'],
            3 : FORECAST['D'],
            4 : FORECAST['H'],
            5 : FORECAST['O'],
            6 : FORECAST['R'],
            7 : FORECAST['U'],
            8 : FORECAST['V'],
            9 : FORECAST['X']
        };

        return fallingTrendForecast[z];
    }

    if (trend === Trend.Steady) {
        if (z < 10) {
            return FORECAST['A'];
        }

        if (z > 19) {
            return FORECAST['Z'];
        }

        const steadyTrendForecast = {
            10 : FORECAST['A'],
            11 : FORECAST['B'],
            12 : FORECAST['E'],
            13 : FORECAST['K'],
            14 : FORECAST['N'],
            15 : FORECAST['P'],
            16 : FORECAST['S'],
            17 : FORECAST['W'],
            18 : FORECAST['X'],
            19 : FORECAST['Z']
        };

        return steadyTrendForecast[z];
    }

    if (trend === Trend.Rising) {
        if (z < 20) {
            return FORECAST['A'];
        }

        if (z > 32) {
            return FORECAST['Z'];
        }

        const risingTrendForecast = {
            20 : FORECAST['A'],
            21 : FORECAST['B'],
            22 : FORECAST['C'],
            23 : FORECAST['F'],
            24 : FORECAST['G'],
            25 : FORECAST['I'],
            26 : FORECAST['J'],
            27 : FORECAST['L'],
            28 : FORECAST['M'],
            29 : FORECAST['Q'],
            30 : FORECAST['T'],
            31 : FORECAST['Y'],
            32 : FORECAST['Z']
        };

        return risingTrendForecast[z];
    }
}

module.exports = calculateForecast;
