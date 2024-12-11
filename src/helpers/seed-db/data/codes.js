export const codes = [
  {
    name: 'Agricultural area',
    code: '100',
    classes: [
      {
        name: 'Arable land',
        code: '110',
        covers: [
          {
            name: 'Land lying fallow',
            code: '111',
            uses: [
              {
                name: 'Fallow',
                code: 'FA01'
              }
            ]
          },
          {
            name: 'Temporary grass',
            code: '112',
            uses: [
              {
                name: 'Temporary grass',
                code: 'TG01'
              }
            ]
          },
          {
            name: 'Catch and cover crops',
            code: '116',
            uses: [
              {
                name: 'Catch crop',
                code: 'CA01'
              },
              {
                name: 'Cover crop',
                code: 'CA02'
              }
            ]
          },
          {
            name: 'Leguminous and nitrogen fixing crops',
            code: '117',
            uses: [
              {
                name: 'Chickpea',
                code: 'LG01'
              },
              {
                name: 'Fenugreek',
                code: 'LG02'
              },
              {
                name: 'Field beans - spring',
                code: 'LG03'
              },
              {
                name: 'Green beans',
                code: 'LG04'
              },
              {
                name: 'Lentils',
                code: 'LG05'
              },
              {
                name: 'Lupins',
                code: 'LG06'
              },
              {
                name: 'Peas - spring',
                code: 'LG07'
              },
              {
                name: 'Soya',
                code: 'LG08'
              },
              {
                name: 'Cowpea',
                code: 'LG09'
              },
              {
                name: "Bird's foot trefoil",
                code: 'LG10'
              },
              {
                name: 'Lucerne',
                code: 'LG11'
              },
              {
                name: 'Sweet clover',
                code: 'LG12'
              },
              {
                name: 'Sainfoin',
                code: 'LG13'
              },
              {
                name: 'Clover',
                code: 'LG14'
              },
              {
                name: 'Mixed crop - leguminous only 1',
                code: 'LG15'
              },
              {
                name: 'Mixed crop - leguminous only 2',
                code: 'LG16'
              },
              {
                name: 'Mixed crop - leguminous only 3',
                code: 'LG17'
              },
              {
                name: 'Mixed crop - leguminous only 4',
                code: 'LG18'
              },
              {
                name: 'Mixed crop - leguminous only 5',
                code: 'LG19'
              },
              {
                name: 'Field beans - winter',
                code: 'LG20'
              },
              {
                name: 'Peas - winter',
                code: 'LG21'
              }
            ]
          },
          {
            name: 'Other arable crops',
            code: '118',
            uses: [
              {
                name: 'Barley - spring',
                code: 'AC32'
              },
              {
                name: 'Basil',
                code: 'AC02'
              },
              {
                name: 'Beet',
                code: 'AC03'
              },
              {
                name: 'Borage',
                code: 'AC04'
              },
              {
                name: 'Buckwheat',
                code: 'AC05'
              },
              {
                name: 'Canary seed',
                code: 'AC06'
              },
              {
                name: 'Carrot',
                code: 'AC07'
              },
              {
                name: 'Celery',
                code: 'AC08'
              },
              {
                name: 'Chicory',
                code: 'AC09'
              },
              {
                name: 'Daffodil',
                code: 'AC10'
              },
              {
                name: 'Dill',
                code: 'AC11'
              },
              {
                name: 'Evening primrose',
                code: 'AC12'
              },
              {
                name: 'Fennel',
                code: 'AC13'
              },
              {
                name: 'Hemp',
                code: 'AC14'
              },
              {
                name: 'Lettuce',
                code: 'AC15'
              },
              {
                name: 'Linseed - spring',
                code: 'AC16'
              },
              {
                name: 'Maize',
                code: 'AC17'
              },
              {
                name: 'Millet',
                code: 'AC18'
              },
              {
                name: 'Oats - spring',
                code: 'AC19'
              },
              {
                name: 'Onions',
                code: 'AC20'
              },
              {
                name: 'Oregano',
                code: 'AC21'
              },
              {
                name: 'Parsley',
                code: 'AC22'
              },
              {
                name: 'Parsnips',
                code: 'AC23'
              },
              {
                name: 'Rye - spring',
                code: 'AC24'
              },
              {
                name: 'Sage',
                code: 'AC25'
              },
              {
                name: 'Spinach',
                code: 'AC26'
              },
              {
                name: 'Strawberry',
                code: 'AC27'
              },
              {
                name: 'Sweet potato',
                code: 'AC28'
              },
              {
                name: 'Thyme',
                code: 'AC29'
              },
              {
                name: 'Triticale - spring',
                code: 'AC30'
              },
              {
                name: 'Tulip',
                code: 'AC31'
              },
              {
                name: 'Wheat - spring',
                code: 'AC32'
              },
              {
                name: 'Yam',
                code: 'AC33'
              },
              {
                name: 'Cabbage - spring',
                code: 'AC34'
              },
              {
                name: 'Turnip',
                code: 'AC35'
              },
              {
                name: 'Oilseed - spring',
                code: 'AC36'
              },
              {
                name: 'Brown mustard',
                code: 'AC37'
              },
              {
                name: 'Mustard',
                code: 'AC38'
              },
              {
                name: 'Crambe',
                code: 'AC39'
              },
              {
                name: 'Rocket',
                code: 'AC40'
              },
              {
                name: 'Radish',
                code: 'AC41'
              },
              {
                name: 'Horseradish',
                code: 'AC42'
              },
              {
                name: 'Tobacco',
                code: 'AC43'
              },
              {
                name: 'Potato',
                code: 'AC44'
              },
              {
                name: 'Tomato',
                code: 'AC45'
              },
              {
                name: 'Aubergine',
                code: 'AC46'
              },
              {
                name: 'Pepper',
                code: 'AC47'
              },
              {
                name: 'Chilli',
                code: 'AC48'
              },
              {
                name: 'Tree chilli',
                code: 'AC49'
              },
              {
                name: 'Squash',
                code: 'AC50'
              },
              {
                name: 'Japanese pie squash',
                code: 'AC51'
              },
              {
                name: 'Siam pumpkin',
                code: 'AC52'
              },
              {
                name: 'Banana squash',
                code: 'AC53'
              },
              {
                name: 'Butternut squash',
                code: 'AC54'
              },
              {
                name: 'Water melon',
                code: 'AC55'
              },
              {
                name: 'Cucumber',
                code: 'AC56'
              },
              {
                name: 'Melon',
                code: 'AC57'
              },
              {
                name: 'Mixed crop - group 1',
                code: 'AC58'
              },
              {
                name: 'Mixed crop - group 2',
                code: 'AC59'
              },
              {
                name: 'Mixed crop - group 3',
                code: 'AC60'
              },
              {
                name: 'Mixed crop - group 4',
                code: 'AC61'
              },
              {
                name: 'Mixed crop - group 5',
                code: 'AC62'
              },
              {
                name: 'Barley - winter',
                code: 'AC63'
              },
              {
                name: 'Linseed - winter',
                code: 'AC64'
              },
              {
                name: 'Oats - winter',
                code: 'AC65'
              },
              {
                name: 'Wheat - winter',
                code: 'AC66'
              },
              {
                name: 'Oilseed - winter',
                code: 'AC67'
              },
              {
                name: 'Rye - winter',
                code: 'AC68'
              },
              {
                name: 'Triticale - winter',
                code: 'AC69'
              },
              {
                name: 'Cabbage - winter',
                code: 'AC70'
              },
              {
                name: 'Coriander',
                code: 'AC71'
              },
              {
                name: 'Corn gromwell',
                code: 'AC72'
              },
              {
                name: 'Camelina',
                code: 'AC73'
              },
              {
                name: 'Phacelia',
                code: 'AC74'
              },
              {
                name: 'Oca',
                code: 'AC75'
              },
              {
                name: 'German chamomile',
                code: 'AC76'
              },
              {
                name: 'Corn chamomile',
                code: 'AC77'
              },
              {
                name: 'Corn cockle',
                code: 'AC78'
              },
              {
                name: 'Corn flower',
                code: 'AC79'
              },
              {
                name: 'Corn marigold',
                code: 'AC80'
              },
              {
                name: 'Poppy',
                code: 'AC81'
              },
              {
                name: 'Field for-get-me-not',
                code: 'AC82'
              },
              {
                name: 'Fox-glove',
                code: 'AC83'
              },
              {
                name: 'Hay rattle',
                code: 'AC84'
              },
              {
                name: 'Hedge bedstraw',
                code: 'AC85'
              },
              {
                name: 'Teasel',
                code: 'AC86'
              },
              {
                name: 'Quinoa',
                code: 'AC87'
              },
              {
                name: 'Sunflower',
                code: 'AC88'
              },
              {
                name: 'Cress',
                code: 'AC89'
              },
              {
                name: 'Gladioli',
                code: 'AC90'
              },
              {
                name: 'Echium',
                code: 'AC91'
              },
              {
                name: 'Sorghum',
                code: 'AC92'
              },
              {
                name: 'Sticky Nightshade',
                code: 'AC93'
              },
              {
                name: 'Sweet Williams',
                code: 'AC94'
              },
              {
                name: 'Wallflower',
                code: 'AC95'
              },
              {
                name: 'Samphire',
                code: 'AC96'
              },
              {
                name: 'Aster (Chinese)',
                code: 'AC97'
              },
              {
                name: 'Larkspur',
                code: 'AC98'
              },
              {
                name: 'Nigella',
                code: 'AC99'
              },
              {
                name: 'Ryegrass (Italian) - grown for seed production',
                code: 'AC100'
              }
            ]
          },
          {
            name: 'Crops under water',
            code: '121',
            uses: [
              {
                name: 'Watercress',
                code: 'CW01'
              }
            ]
          }
        ]
      },
      {
        name: 'Permanent grassland',
        code: '130',
        covers: [
          {
            name: 'Permanent grassland',
            code: '131',
            uses: [
              {
                name: 'Permanent grassland',
                code: 'PG01'
              }
            ]
          }
        ]
      },
      {
        name: 'Permanent crops',
        code: '140',
        covers: [
          {
            name: 'Perennial crops',
            code: '141',
            uses: [
              {
                name: 'Perennial crops',
                code: 'TC01'
              }
            ]
          },
          {
            name: 'Nurseries',
            code: '142',
            uses: [
              {
                name: 'Nursery crops',
                code: 'NU01'
              }
            ]
          },
          {
            name: 'Short rotation coppice',
            code: '143',
            uses: [
              {
                name: 'Short rotation coppice',
                code: 'SR01'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Landscape features',
    code: '200',
    classes: [
      {
        name: 'Linear features',
        code: '210',
        covers: [
          {
            name: 'Stone wall',
            code: '211',
            uses: [
              {
                name: 'Stone wall',
                code: 'BF01'
              }
            ]
          },
          {
            name: 'Hedge',
            code: '212',
            uses: [
              {
                name: 'Hedges',
                code: 'BF02'
              },
              {
                name: 'Half hedge',
                code: 'BF11'
              },
              {
                name: 'Adjacent hedge',
                code: 'BF12'
              }
            ]
          },
          {
            name: 'Bank',
            code: '218',
            uses: [
              {
                name: 'Bank',
                code: 'BF08'
              }
            ]
          },
          {
            name: 'Buffer strip',
            code: '219',
            uses: [
              {
                name: 'Buffer strip',
                code: 'BF15'
              }
            ]
          },
          {
            name: 'Fence',
            code: '291',
            uses: [
              {
                name: 'Fence',
                code: 'BF16'
              }
            ]
          }
        ]
      },
      {
        name: 'Boundary features',
        code: '220',
        covers: [
          {
            name: 'Short stone wall',
            code: '221',
            uses: [
              {
                name: 'Short stone wall',
                code: 'BB01'
              }
            ]
          }
        ]
      },
      {
        name: 'Water/irrigation features',
        code: '240',
        covers: [
          {
            name: 'Drain/ditch/dyke',
            code: '241',
            uses: [
              {
                name: 'Drain/ditch/dyke',
                code: 'WF01'
              }
            ]
          },
          {
            name: 'Pond',
            code: '243',
            uses: [
              {
                name: 'Pond',
                code: 'WF03'
              }
            ]
          }
        ]
      },
      {
        name: 'Rock',
        code: '250',
        covers: [
          {
            name: 'Scree',
            code: '251',
            uses: [
              {
                name: 'Scree',
                code: 'RO02'
              }
            ]
          },
          {
            name: 'Boulders',
            code: '252',
            uses: [
              {
                name: 'Boulders',
                code: 'RO03'
              }
            ]
          },
          {
            name: 'Rocky outcrop',
            code: '253',
            uses: [
              {
                name: 'Rocky outcrop',
                code: 'RO04'
              }
            ]
          }
        ]
      },
      {
        name: 'Heaps',
        code: '270',
        covers: [
          {
            name: 'Heaps',
            code: '271',
            uses: [
              {
                name: 'Heaps',
                code: 'HE03'
              }
            ]
          }
        ]
      },
      {
        name: 'Notional features',
        code: '280',
        covers: [
          {
            name: 'Notional - rock',
            code: '281',
            uses: [
              {
                name: 'Scattered rock',
                code: 'NF01'
              }
            ]
          },
          {
            name: 'Notional - bracken',
            code: '282',
            uses: [
              {
                name: 'Scattered bracken',
                code: 'NF02'
              }
            ]
          },
          {
            name: 'Notional - scrub',
            code: '283',
            uses: [
              {
                name: 'Scattered scrub',
                code: 'NF03'
              }
            ]
          },
          {
            name: 'Notional - trees',
            code: '284',
            uses: [
              {
                name: 'Scattered patches of trees',
                code: 'NF04'
              }
            ]
          },
          {
            name: 'Notional - water',
            code: '285',
            uses: [
              {
                name: 'Scattered water features',
                code: 'NF05'
              }
            ]
          },
          {
            name: 'Notional - natural',
            code: '286',
            uses: [
              {
                name: 'Scattered natural features',
                code: 'NF06'
              }
            ]
          },
          {
            name: 'Notional - manmade',
            code: '287',
            uses: [
              {
                name: 'Scattered manmade features',
                code: 'NF07'
              }
            ]
          },
          {
            name: 'Notional - mixed',
            code: '288',
            uses: [
              {
                name: 'Scattered features - mixed',
                code: 'NF08'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Non-agricultural area',
    code: '300',
    classes: [
      {
        name: 'Non-agricultural area',
        code: '300',
        covers: [
          {
            name: 'Non-agricultural area',
            code: '300',
            uses: [
              {
                name: 'Non-agricultural area',
                code: 'NA02'
              },
              {
                name: 'Non-agri BPS eligible',
                code: 'RD01'
              }
            ]
          }
        ]
      },
      {
        name: 'Woodland',
        code: '330',
        covers: [
          {
            name: 'Woodland',
            code: '332',
            uses: [
              {
                name: 'Woodland',
                code: 'WO12'
              }
            ]
          },
          {
            name: 'Residential gardens',
            code: '338',
            uses: [
              {
                name: 'Residential gardens',
                code: 'WO17'
              }
            ]
          },
          {
            name: 'Scrub - ungrazeable',
            code: '347',
            uses: [
              {
                name: 'Scrub - ungrazeable',
                code: 'WO25'
              }
            ]
          }
        ]
      },
      {
        name: 'Agricultural buildings',
        code: '370',
        covers: [
          {
            name: 'Farm building',
            code: '371',
            uses: [
              {
                name: 'Farm building',
                code: 'AB01'
              }
            ]
          },
          {
            name: 'Shelter on bare soil',
            code: '373',
            uses: [
              {
                name: 'Shelter on bare soil',
                code: 'AB03'
              }
            ]
          },
          {
            name: 'Glasshouse',
            code: '376',
            uses: [
              {
                name: 'Glasshouse',
                code: 'AB06'
              }
            ]
          },
          {
            name: 'Farmyards',
            code: '379',
            uses: [
              {
                name: 'Farmyards',
                code: 'AB09'
              }
            ]
          }
        ]
      },
      {
        name: 'Non-recreational buildings in a rural area',
        code: '390',
        covers: [
          {
            name: '"Residential dwelling',
            code: ' house"',
            uses: [
              {
                name: '391',
                code: '"Residential dwelling'
              }
            ]
          }
        ]
      },
      {
        name: 'Structure',
        code: '520',
        covers: [
          {
            name: 'Structure',
            code: '525',
            uses: [
              {
                name: 'Structure',
                code: 'ST05'
              }
            ]
          }
        ]
      },
      {
        name: 'Utility',
        code: '530',
        covers: [
          {
            name: 'Solar panels',
            code: '531',
            uses: [
              {
                name: 'Solar panels',
                code: 'UT01'
              }
            ]
          },
          {
            name: 'General utility',
            code: '536',
            uses: [
              {
                name: 'General utility',
                code: 'UT06'
              }
            ]
          },
          {
            name: 'Water treatment works',
            code: '537',
            uses: [
              {
                name: 'Water treatment works',
                code: 'UT07'
              }
            ]
          }
        ]
      },
      {
        name: 'Hard standing',
        code: '550',
        covers: [
          {
            name: 'Hard standing',
            code: '551',
            uses: [
              {
                name: 'Hard standing',
                code: 'HS01'
              }
            ]
          }
        ]
      },
      {
        name: 'Real estate services',
        code: '560',
        covers: [
          {
            name: 'Real estate services',
            code: '561',
            uses: [
              {
                name: 'Real estate services',
                code: 'ES01'
              }
            ]
          }
        ]
      },
      {
        name: 'Storage areas',
        code: '570',
        covers: [
          {
            name: 'Storage area',
            code: '571',
            uses: [
              {
                name: 'Storage area',
                code: 'SA02'
              }
            ]
          }
        ]
      },
      {
        name: 'Inland water',
        code: '580',
        covers: [
          {
            name: 'River/ Stream on a boundary',
            code: '581',
            uses: [
              {
                name: 'River/ Stream on a boundary',
                code: 'IW01'
              }
            ]
          },
          {
            name: 'Rivers and Streams type 2',
            code: '582',
            uses: [
              {
                name: 'Rivers and Streams type 2',
                code: 'IW02'
              }
            ]
          },
          {
            name: 'Rivers and Streams type 3',
            code: '583',
            uses: [
              {
                name: 'Rivers and Streams type 3',
                code: 'IW03'
              }
            ]
          },
          {
            name: 'Drain/Ditch/Dyke on a boundary',
            code: '588',
            uses: [
              {
                name: 'Drain/Ditch/Dyke on a boundary',
                code: 'IW11'
              }
            ]
          }
        ]
      },
      {
        name: 'Inland wetland',
        code: '590',
        covers: [
          {
            name: 'Shingle',
            code: '591',
            uses: [
              {
                name: 'Shingle',
                code: 'IW05'
              }
            ]
          },
          {
            name: 'Fen marsh & swamp',
            code: '592',
            uses: [
              {
                name: 'Fen marsh & swamp',
                code: 'IW06'
              }
            ]
          },
          {
            name: 'Bog',
            code: '593',
            uses: [
              {
                name: 'Bog',
                code: 'IW07'
              }
            ]
          }
        ]
      },
      {
        name: 'Marine wetland',
        code: '610',
        covers: [
          {
            name: 'Salt marsh - ungrazeable',
            code: '611',
            uses: [
              {
                name: 'Salt marsh - ungrazeable',
                code: 'MW01'
              }
            ]
          },
          {
            name: 'Tidal areas',
            code: '612',
            uses: [
              {
                name: 'Tidal areas',
                code: 'MW02'
              }
            ]
          },
          {
            name: 'Reed beds',
            code: '613',
            uses: [
              {
                name: 'Reed beds',
                code: 'MW03'
              }
            ]
          },
          {
            name: 'Intertidal habitats',
            code: '614',
            uses: [
              {
                name: 'Intertidal habitats',
                code: 'MW04'
              }
            ]
          },
          {
            name: 'Saline habitats',
            code: '615',
            uses: [
              {
                name: 'Saline habitats',
                code: 'MW05'
              }
            ]
          }
        ]
      },
      {
        name: 'Coastal features',
        code: '620',
        covers: [
          {
            name: 'Cliffs',
            code: '621',
            uses: [
              {
                name: 'Cliffs',
                code: 'CF01'
              }
            ]
          },
          {
            name: 'Vegetated shingle',
            code: '622',
            uses: [
              {
                name: 'Vegetated shingle',
                code: 'CF02'
              }
            ]
          },
          {
            name: 'Sand dunes',
            code: '623',
            uses: [
              {
                name: 'Sand dunes',
                code: 'CF03'
              }
            ]
          }
        ]
      },
      {
        name: 'Manmade transport',
        code: '630',
        covers: [
          {
            name: 'Metalled track',
            code: '631',
            uses: [
              {
                name: 'Metalled Track',
                code: 'MT01'
              }
            ]
          },
          {
            name: 'Roads',
            code: '633',
            uses: [
              {
                name: 'Roads',
                code: 'MT03'
              }
            ]
          },
          {
            name: 'Railway',
            code: '634',
            uses: [
              {
                name: 'Railway',
                code: 'MT04'
              }
            ]
          },
          {
            name: 'Airstrip/airports',
            code: '635',
            uses: [
              {
                name: 'Airstrip/airports',
                code: 'MT05'
              }
            ]
          }
        ]
      },
      {
        name: 'Natural transport - tracks and gallops',
        code: '640',
        covers: [
          {
            name: 'Gallop',
            code: '641',
            uses: [
              {
                name: 'Gallop',
                code: 'NT01'
              }
            ]
          },
          {
            name: 'Track - natural surface',
            code: '643',
            uses: [
              {
                name: 'Track - natural surface',
                code: 'NT03'
              }
            ]
          }
        ]
      },
      {
        name: 'Heath land and bracken',
        code: '650',
        covers: [
          {
            name: 'Heath land and bracken - ungrazeable',
            code: '651',
            uses: [
              {
                name: 'Heath land and bracken - ungrazeable',
                code: 'HE02'
              }
            ]
          }
        ]
      },
      {
        name: 'Recreational land',
        code: '660',
        covers: [
          {
            name: 'Sports and recreation',
            code: '663',
            uses: [
              {
                name: 'Sports and recreation',
                code: 'RL03'
              }
            ]
          },
          {
            name: 'Golf course',
            code: '664',
            uses: [
              {
                name: 'Golf course',
                code: 'RL04'
              }
            ]
          }
        ]
      },
      {
        name: 'Cultivated and managed',
        code: '670',
        covers: [
          {
            name: 'Peat production',
            code: '671',
            uses: [
              {
                name: 'Peat production',
                code: 'CM01'
              }
            ]
          },
          {
            name: 'Turf production',
            code: '672',
            uses: [
              {
                name: 'Turf production',
                code: 'CM02'
              }
            ]
          }
        ]
      },
      {
        name: 'Manmade surface',
        code: '680',
        covers: [
          {
            name: 'Mineral extraction site',
            code: '681',
            uses: [
              {
                name: 'Mineral extraction site',
                code: 'MS04'
              }
            ]
          }
        ]
      },
      {
        name: 'Archaeological site',
        code: '690',
        covers: [
          {
            name: 'Archaeological site',
            code: '691',
            uses: [
              {
                name: 'Archaeological site',
                code: 'AS01'
              }
            ]
          }
        ]
      },
      {
        name: 'Peripheral land',
        code: '710',
        covers: [
          {
            name: 'Non-utilised Bank',
            code: '711',
            uses: [
              {
                name: 'Non-utilised bank',
                code: 'PL01'
              }
            ]
          },
          {
            name: 'Uncropped',
            code: '712',
            uses: [
              {
                name: 'Uncropped',
                code: 'PL02'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Unknown',
    code: '400',
    classes: [
      {
        name: 'Unknown',
        code: '400',
        covers: [
          {
            name: 'Unknown',
            code: '0',
            uses: [
              {
                name: 'Unknown',
                code: '0'
              }
            ]
          }
        ]
      }
    ]
  }
]
