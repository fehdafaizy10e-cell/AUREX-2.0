"""AUREX data and web server (Python standard library only).
Run:  python server.py   then open  http://localhost:8000
The page loads its mission data from /data.js, which is built here from the Python data below.
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
MISSIONS = [{'id': 'ranger-7',
  'name': 'Ranger 7',
  'target': 'moon',
  'year': 1964,
  'image_query': 'Ranger 7 spacecraft',
  'summary': 'A robotic probe that took the first close-up pictures of the Moon, then crashed into it on '
             'purpose.',
  'why': 'Before astronauts could land, NASA needed sharp pictures of the lunar surface. Ranger 7 was the '
         'first of the Ranger series to work, after six earlier attempts failed.',
  'asked': ['What does the Moon’s surface look like up close?', 'Is it smooth enough for a landing?'],
  'answered': ['It returned 4,308 photos that showed a rough, cratered surface with many safe-looking flat '
               'areas.'],
  'team': 'Built and managed by NASA’s Jet Propulsion Laboratory (JPL).',
  'outcome': 'Launched July 28, 1964. On July 31 it sent pictures until it hit the Moon’s Sea of Clouds, as '
             'planned.',
  'quiz': [{'q': 'How did Ranger 7’s mission end?',
            'options': ['It landed softly', 'It crashed on purpose', 'It returned to Earth'],
            'answer': 1},
           {'q': 'What did Ranger 7 send back?',
            'options': ['Close-up photos', 'Moon rocks', 'Astronauts’ voices'],
            'answer': 0}],
  'stats': [['Launched', 'July 28, 1964'], ['Impact', 'July 31, 1964'], ['Photos', '4,308']],
  'facts': ['Six earlier Ranger missions failed before this one succeeded.',
            'It crashed into an area later named Mare Cognitum, the “Known Sea”.'],
  'st': 'crashed',
  'where': 'Its wreckage lies on the Moon’s surface in Mare Cognitum, where it struck on July 31, 1964.',
  'now': 'It was built to crash. Its last pictures reached Earth moments before impact on July 31, 1964, so '
         'its work was finished when it hit the surface.',
  'left': True,
  'ops': False,
  'inst': 'Six television cameras (two wide-angle and four narrow-angle) that photographed the surface as it '
          'fell toward the Moon.',
  'matter': 'The pictures showed that the Moon’s surface was firm enough, with flat areas that could be '
            'considered for landings.',
  'legacy': 'Its success led to Rangers 8 and 9 and gave Apollo planners their first sharp look at the '
            'terrain.'},
 {'id': 'surveyor-1',
  'name': 'Surveyor 1',
  'target': 'moon',
  'year': 1966,
  'image_query': 'Surveyor 1 lunar lander',
  'summary': 'The first American spacecraft to make a soft landing on the Moon.',
  'why': 'NASA needed to prove a spacecraft could land gently and that the surface could hold weight.',
  'asked': ['Can a spacecraft land softly on the Moon?', 'Is the lunar soil firm enough to stand on?'],
  'answered': ['Yes to both. It landed safely and sent over 11,000 images of the surface.'],
  'team': 'Managed by JPL and built by Hughes Aircraft Company.',
  'outcome': 'Launched May 30, 1966 and landed June 2, 1966 in the Ocean of Storms. It remains on the Moon '
             'today.',
  'quiz': [{'q': 'What was Surveyor 1’s big first?',
            'options': ['First US soft Moon landing', 'First crewed landing', 'First Mars landing'],
            'answer': 0},
           {'q': 'In what year did it land?', 'options': ['1959', '1966', '1972'], 'answer': 1}],
  'stats': [['Launched', 'May 30, 1966'], ['Landed', 'June 2, 1966'], ['Images', '11,000+']],
  'facts': ['It succeeded on the very first try of the Surveyor series.',
            'It stayed on the Moon and still sits in the Ocean of Storms.'],
  'st': 'inactive',
  'where': 'It sits where it landed, in the Ocean of Storms on the Moon.',
  'now': 'It sent pictures through its first lunar day and was woken up again for later days. NASA’s last '
         'contact came in early 1967, when the cold lunar night left it unable to make power.',
  'left': False,
  'ops': False,
  'inst': 'A television camera, plus sensors in its legs and body that recorded how hard it landed and how '
          'hot or cold it got.',
  'matter': 'It proved a spacecraft could land gently and that the lunar soil could support weight, a key '
            'worry before Apollo.',
  'legacy': 'Later Surveyors analyzed soil and photographed possible Apollo landing sites, and Apollo 12 '
            'astronauts even visited Surveyor 3.'},
 {'id': 'lunar-orbiter-1',
  'name': 'Lunar Orbiter 1',
  'target': 'moon',
  'year': 1966,
  'image_query': 'Lunar Orbiter 1',
  'summary': 'A camera-carrying spacecraft that circled the Moon to map possible Apollo landing sites.',
  'why': 'Apollo astronauts needed safe places to land, so NASA photographed the Moon from orbit.',
  'asked': ['Where are the smoothest, safest landing zones?'],
  'answered': ['It photographed candidate sites and also took the first picture of Earth seen from lunar '
               'orbit.'],
  'team': 'Built by Boeing and managed by NASA’s Langley Research Center.',
  'outcome': 'Launched August 10, 1966. It was deliberately crashed into the Moon in October 1966 to avoid '
             'radio interference.',
  'quiz': [{'q': 'Why was Lunar Orbiter 1 sent?',
            'options': ['To pick Apollo landing sites', 'To bring back rocks', 'To test rockets'],
            'answer': 0},
           {'q': 'What did it circle?', 'options': ['Mars', 'The Moon', 'Venus'], 'answer': 1}],
  'stats': [['Launched', 'Aug 10, 1966'], ['Job', 'Mapping Apollo sites'], ['Built by', 'Boeing']],
  'facts': ['Its picture of Earth rising over the Moon in August 1966 was a first from lunar orbit.'],
  'st': 'crashed',
  'where': 'Its wreckage is on the far side of the Moon, where NASA crashed it on purpose in late October '
           '1966.',
  'now': 'Its film supply ran low, so NASA sent it into the Moon on purpose to keep its radio from '
         'interfering with later Lunar Orbiters.',
  'left': True,
  'ops': False,
  'inst': 'A two-lens camera that took pictures on film, developed the film on board and scanned it for '
          'radio transmission, plus detectors for radiation and tiny space dust.',
  'matter': 'Its pictures of possible landing sites made crewed landings safer.',
  'legacy': 'Five Lunar Orbiters mapped nearly the whole Moon, and Apollo landing sites were chosen using '
            'their images.'},
 {'id': 'apollo-11',
  'name': 'Apollo 11',
  'target': 'moon',
  'year': 1969,
  'image_query': 'Apollo 11 lunar module Eagle',
  'summary': 'The mission that first landed humans on the Moon: Neil Armstrong and Buzz Aldrin walked there '
             'on July 20, 1969.',
  'why': 'In 1961 President John F. Kennedy set the goal of landing a person on the Moon and returning them '
         'safely before the decade ended. Apollo 11 achieved it.',
  'asked': ['Can humans travel to the Moon and return safely?', 'Can people work on the lunar surface?'],
  'answered': ['Yes. Two astronauts spent about 21 hours on the surface, walked outside for about 2.5 hours, '
               'and brought back about 21.5 kg of rocks and soil.'],
  'team': 'Built by thousands of NASA engineers and contractors: the Saturn V rocket was led by Wernher von '
          'Braun’s team at Marshall Space Flight Center, the lunar module Eagle by Grumman, and the command '
          'module Columbia by North American Aviation.',
  'outcome': 'Launched July 16, 1969 with Armstrong, Aldrin and Michael Collins. Armstrong and Aldrin landed '
             'in the Sea of Tranquility while Collins orbited above. All three splashed down safely on July '
             '24.',
  'quiz': [{'q': 'Who stayed in orbit around the Moon?',
            'options': ['Neil Armstrong', 'Buzz Aldrin', 'Michael Collins'],
            'answer': 2},
           {'q': 'What was the lunar module called?',
            'options': ['Eagle', 'Columbia', 'Challenger'],
            'answer': 0}],
  'stats': [['Launched', 'July 16, 1969'], ['Landed', 'July 20, 1969'], ['Samples', 'about 21.5 kg']],
  'facts': ['The Saturn V rocket stood about 111 m tall.',
            'The lunar module’s descent stage is still on the Moon today.'],
  'st': 'completed',
  'where': 'The lunar module’s descent stage, a flag, science instruments and many tools remain at '
           'Tranquility Base on the Moon. The command module Columbia is displayed at the Smithsonian’s '
           'National Air and Space Museum.',
  'now': 'The mission ended on July 24, 1969, when the crew splashed down in the Pacific Ocean with the '
         'lunar samples. Scientists still bounce lasers off its reflector today.',
  'left': True,
  'ops': False,
  'inst': 'A passive seismometer to detect moonquakes, a laser reflector to measure the Earth-Moon distance, '
          'a solar wind collector, cameras and tools for gathering lunar soil and rock.',
  'matter': 'It showed that people can travel to another world and return, and its rocks gave the first '
            'direct evidence of the Moon’s age and makeup.',
  'legacy': 'Every later crewed lunar mission, including today’s Artemis program, builds on what Apollo 11 '
            'taught about landing and working away from Earth.'},
 {'id': 'apollo-17',
  'name': 'Apollo 17',
  'target': 'moon',
  'year': 1972,
  'image_query': 'Apollo 17 Taurus-Littrow',
  'summary': 'The last crewed Moon landing so far, and the only one with a professional geologist walking on '
             'the surface.',
  'why': 'It was the final Apollo mission and focused on collecting a wide variety of rocks to understand '
         'the Moon’s history.',
  'asked': ['How old is the Moon and how did it form?'],
  'answered': ['Its samples (about 110 kg) helped scientists study the Moon’s volcanic past and age.'],
  'team': 'NASA’s Apollo program; crew Eugene Cernan, Harrison Schmitt and Ronald Evans.',
  'outcome': 'Flew December 7-19, 1972, landing in the Taurus-Littrow valley. No humans have walked on the '
             'Moon since.',
  'quiz': [{'q': 'Who was the geologist who walked on the Moon?',
            'options': ['Harrison Schmitt', 'Alan Shepard', 'Jim Lovell'],
            'answer': 0},
           {'q': 'Apollo 17 was the...',
            'options': ['First landing', 'Last Apollo landing', 'Only uncrewed flight'],
            'answer': 1}],
  'stats': [['Launched', 'Dec 7, 1972'], ['On the surface', 'about 75 hours'], ['Samples', 'about 110 kg']],
  'facts': ['Three moonwalks added up to more than 22 hours outside.'],
  'st': 'completed',
  'where': 'The lunar module descent stage, the lunar rover and the science station remain at Taurus-Littrow '
           'on the Moon. The command module America is displayed at Space Center Houston.',
  'now': 'The astronauts returned on December 19, 1972. NASA switched off its science station on September '
         '30, 1977, after nearly five years of data.',
  'left': True,
  'ops': False,
  'inst': 'A science station with heat-flow, gravity and seismic instruments, a lunar rover, cameras, and '
          'geology tools for collecting rocks and soil.',
  'matter': 'Its samples and measurements helped reveal the Moon’s volcanic history and age.',
  'legacy': 'Apollo 17 closed the Apollo era, and its data are still studied as NASA plans the return to the '
            'Moon with Artemis.'},
 {'id': 'lro',
  'name': 'Lunar Reconnaissance Orbiter',
  'target': 'moon',
  'year': 2009,
  'image_query': 'Lunar Reconnaissance Orbiter',
  'summary': 'A NASA orbiter that has been mapping the Moon in great detail since 2009.',
  'why': 'Future astronauts need detailed maps, safe landing sites and knowledge of resources such as water '
         'ice.',
  'asked': ['Where can we land safely?', 'Is there water ice near the poles?'],
  'answered': ['It produced detailed maps and photographed old Apollo landing sites and hardware left '
               'behind.'],
  'team': 'Managed by NASA’s Goddard Space Flight Center.',
  'outcome': 'Launched June 18, 2009 and still in service as of its latest extended missions.',
  'quiz': [{'q': 'What does LRO mainly do?',
            'options': ['Maps the Moon from orbit', 'Drives on Mars', 'Studies the Sun'],
            'answer': 0},
           {'q': 'It photographed what left behind?',
            'options': ['Apollo landing sites', 'Mars rovers', 'Satellites only'],
            'answer': 0}],
  'stats': [['Launched', 'June 18, 2009'], ['Job', 'Orbital mapping'], ['Managed by', 'Goddard']],
  'facts': ['It photographed footpaths and rover tracks left by Apollo astronauts.'],
  'st': 'active',
  'where': 'It is orbiting the Moon.',
  'now': 'It is still working in lunar orbit, mapping the surface, measuring radiation and temperatures, and '
         'searching for water ice near the poles to help plan safe landing sites for Artemis.',
  'left': False,
  'ops': True,
  'inst': 'Cameras (LROC), a laser altimeter (LOLA), a heat sensor (Diviner), an ultraviolet mapper (LAMP), '
          'a neutron detector (LEND), a radiation telescope (CRaTER) and a radar (Mini-RF).',
  'matter': 'Its maps show where astronauts can land safely and where water ice may be found.',
  'legacy': 'Artemis planners use its data to choose landing sites.'},
 {'id': 'artemis-1',
  'name': 'Artemis I',
  'target': 'moon',
  'year': 2022,
  'image_query': 'Artemis I Orion SLS launch',
  'summary': 'An uncrewed test flight of NASA’s Space Launch System rocket and Orion capsule around the '
             'Moon.',
  'why': 'NASA wanted to prove the new rocket and capsule were safe before putting astronauts on board for '
         'Artemis II.',
  'asked': ['Can Orion survive deep space and a fiery return to Earth?'],
  'answered': ['Orion flew around the Moon and splashed down successfully, testing its heat shield.'],
  'team': 'NASA with contractors including Boeing, Lockheed Martin and Airbus (Orion’s service module).',
  'outcome': 'Launched November 16, 2022 and splashed down in the Pacific on December 11, 2022.',
  'quiz': [{'q': 'Who flew on Artemis I?',
            'options': ['No astronauts', 'Four astronauts', 'Two astronauts'],
            'answer': 0},
           {'q': 'What capsule did it carry?', 'options': ['Orion', 'Dragon', 'Eagle'], 'answer': 0}],
  'stats': [['Launched', 'Nov 16, 2022'], ['Splashdown', 'Dec 11, 2022'], ['Crew', 'None']],
  'facts': ['Orion carried test mannequins fitted with sensors to measure radiation.'],
  'st': 'completed',
  'where': 'Orion splashed down in the Pacific Ocean and was recovered. The rocket’s upper stage was sent '
           'into orbit around the Sun, and the core stage fell into the ocean.',
  'now': 'The mission ended on December 11, 2022 with a splashdown after about 25.5 days. Its last report '
         'confirmed that the heat shield worked on a fast return from the Moon.',
  'left': False,
  'ops': False,
  'inst': 'Sensors on the Orion capsule and on test mannequins that measured radiation, heat and vibration, '
          'plus ten small CubeSat satellites carrying extra experiments.',
  'matter': 'It proved Orion could keep future astronauts safe on a trip around the Moon.',
  'legacy': 'Its results cleared the way for Artemis II, the first crewed flight of the program.'},
 {'id': 'mariner-4',
  'name': 'Mariner 4',
  'target': 'mars',
  'year': 1965,
  'image_query': 'Mariner 4 spacecraft Mars',
  'summary': 'The first spacecraft to send close-up photos of Mars.',
  'why': 'Scientists wanted to see Mars up close and learn whether it looked like Earth.',
  'asked': ['What does the surface of Mars look like?'],
  'answered': ['Its 21 photos showed a cratered, Moon-like world, surprising many people.'],
  'team': 'Built and operated by JPL.',
  'outcome': 'Launched November 28, 1964 and flew past Mars in July 1965.',
  'quiz': [{'q': 'What planet did Mariner 4 visit?', 'options': ['Mars', 'Venus', 'Jupiter'], 'answer': 0},
           {'q': 'What did its photos show?', 'options': ['Craters', 'Oceans', 'Cities'], 'answer': 0}],
  'stats': [['Launched', 'Nov 28, 1964'], ['Flyby', 'July 1965'], ['Photos', '21']],
  'facts': ['Each photo took hours to send back to Earth.'],
  'st': 'inactive',
  'where': 'It orbits the Sun, far from Earth.',
  'now': 'NASA lost contact on December 21, 1967, when the spacecraft’s power and steering gas were nearly '
         'gone. It was never designed to return.',
  'left': False,
  'ops': False,
  'inst': 'A television camera, plus detectors for cosmic rays, magnetic fields, trapped radiation, dust and '
          'the solar wind.',
  'matter': 'It revealed Mars as a cratered world with a very thin atmosphere, changing how scientists '
            'thought about life there.',
  'legacy': 'Later Mariner and Viking missions were planned using what it found.'},
 {'id': 'viking-1',
  'name': 'Viking 1',
  'target': 'mars',
  'year': 1976,
  'image_query': 'Viking 1 lander Mars',
  'summary': 'NASA’s first successful Mars lander, which also searched for signs of life.',
  'why': 'Scientists asked whether life could exist on Mars, so the Vikings carried experiments to test the '
         'soil.',
  'asked': ['Is there life in Martian soil?', 'What is the weather like on Mars?'],
  'answered': ['The tests gave puzzling results but found no clear proof of life. It also sent the first '
               'color pictures from the surface.'],
  'team': 'Managed by NASA’s Langley Research Center, with orbiters and landers built with JPL and Martin '
          'Marietta.',
  'outcome': 'Launched August 20, 1975 and landed July 20, 1976 on Chryse Planitia. It worked for over six '
             'years.',
  'quiz': [{'q': 'What did Viking 1 look for?', 'options': ['Signs of life', 'Gold', 'Cities'], 'answer': 0},
           {'q': 'Where did it land?', 'options': ['Mars', 'The Moon', 'Mercury'], 'answer': 0}],
  'stats': [['Launched', 'Aug 20, 1975'], ['Landed', 'July 20, 1976'], ['Worked for', 'over 6 years']],
  'facts': ['The lander was later renamed the Thomas A. Mutch Memorial Station.'],
  'st': 'inactive',
  'where': 'The lander stands on Chryse Planitia on Mars. Its orbiter shut down in 1980.',
  'now': 'The lander worked for over six years. NASA lost contact on November 11, 1982, after a faulty '
         'command, and could not restore it.',
  'left': False,
  'ops': False,
  'inst': 'Three biology experiments, a gas chromatograph and mass spectrometer to detect chemicals, an '
          'X-ray instrument for soil, color cameras and weather sensors.',
  'matter': 'It gave the first long look at the Martian surface and weather and tested the soil for life.',
  'legacy': 'Its results guided how later missions search for habitable places and signs of past water.'},
 {'id': 'sojourner',
  'name': 'Mars Pathfinder and Sojourner',
  'target': 'mars',
  'year': 1997,
  'image_query': 'Sojourner rover Mars Pathfinder',
  'summary': 'The mission that put the first wheeled rover, Sojourner, on Mars.',
  'why': 'NASA wanted a cheaper, faster way to land on Mars and to test a roving robot.',
  'asked': ['Can a small rover drive on Mars?', 'What are Martian rocks made of?'],
  'answered': ['Yes. Sojourner analyzed rocks and soil near the lander for far longer than planned.'],
  'team': 'Managed by JPL.',
  'outcome': 'Launched December 4, 1996 and landed July 4, 1997 in Ares Vallis.',
  'quiz': [{'q': 'What was the rover called?', 'options': ['Sojourner', 'Spirit', 'Curiosity'], 'answer': 0},
           {'q': 'Pathfinder landed in...', 'options': ['1997', '1969', '2012'], 'answer': 0}],
  'stats': [['Launched', 'Dec 4, 1996'], ['Landed', 'July 4, 1997'], ['Rover mass', 'about 10.5 kg']],
  'facts': ['The lander bounced across the surface inside giant airbags.'],
  'st': 'inactive',
  'where': 'Both the Pathfinder lander and the Sojourner rover remain in Ares Vallis on Mars.',
  'now': 'NASA’s last signal from Pathfinder came on September 27, 1997, after about three months, probably '
         'because its battery failed in the cold.',
  'left': False,
  'ops': False,
  'inst': 'The rover carried an X-ray spectrometer to find which elements are in rocks; the lander had '
          'cameras and weather sensors.',
  'matter': 'It proved a small, low-cost rover could explore Mars.',
  'legacy': 'Its design led the way to Spirit, Opportunity, Curiosity and Perseverance.'},
 {'id': 'spirit-opportunity',
  'name': 'Spirit and Opportunity',
  'target': 'mars',
  'year': 2004,
  'image_query': 'Mars Exploration Rover Opportunity',
  'summary': 'Twin rovers that searched for evidence of past water on Mars.',
  'why': 'Scientists suspected Mars once had liquid water, and these rovers were sent to find proof.',
  'asked': ['Was there ever liquid water on Mars?'],
  'answered': ['Both found rocks and minerals formed in the presence of water.'],
  'team': 'Built and operated by JPL.',
  'outcome': 'Spirit landed January 4, 2004 and Opportunity on January 25, 2004. They were planned for 90 '
             'days; Opportunity worked until 2018.',
  'quiz': [{'q': 'What did the twin rovers look for?',
            'options': ['Evidence of water', 'Aliens', 'Oil'],
            'answer': 0},
           {'q': 'Which rover landed in Meridiani Planum?',
            'options': ['Opportunity', 'Spirit', 'Sojourner'],
            'answer': 0}],
  'stats': [['Landed', 'Jan 2004'], ['Planned life', '90 days'], ['Opportunity lasted', 'about 14 years']],
  'facts': ['Opportunity drove more than 45 km across Mars.'],
  'st': 'inactive',
  'where': 'Spirit rests in Gusev crater, and Opportunity rests in Perseverance Valley on the rim of '
           'Endeavour crater.',
  'now': 'Spirit became stuck in soft sand in 2009, and NASA lost contact in March 2010. Opportunity went '
         'silent in June 2018 during a huge dust storm, and NASA ended its mission in February 2019.',
  'left': False,
  'ops': False,
  'inst': 'Panoramic cameras, a heat-sensing spectrometer, a Mössbauer spectrometer and an X-ray '
          'spectrometer for rocks, a microscope camera and a tool for grinding rock surfaces.',
  'matter': 'They found clear evidence that liquid water once shaped Mars, making it a better place to look '
            'for past life.',
  'legacy': 'Their work shaped Curiosity and Perseverance and set the plan to follow the water on Mars.'},
 {'id': 'curiosity',
  'name': 'Curiosity',
  'target': 'mars',
  'year': 2012,
  'image_query': 'Curiosity rover Gale crater',
  'summary': 'A car-sized rover exploring Gale crater to learn if Mars could ever have supported life.',
  'why': 'After finding signs of water, NASA asked whether ancient Mars had the right conditions for '
         'microbes.',
  'asked': ['Was Mars ever habitable?'],
  'answered': ['It found that Gale crater once had fresh water and key chemical ingredients for life.'],
  'team': 'Built and operated by JPL.',
  'outcome': 'Launched November 26, 2011 and landed August 2012 using the dramatic sky crane. It is still '
             'exploring.',
  'quiz': [{'q': 'How did Curiosity land?',
            'options': ['Sky crane', 'Parachute only', 'Runway'],
            'answer': 0},
           {'q': 'Where does it explore?',
            'options': ['Gale crater', 'Jezero crater', 'Tycho crater'],
            'answer': 0}],
  'stats': [['Launched', 'Nov 26, 2011'], ['Landed', 'Aug 2012'], ['Weight', 'about 900 kg']],
  'facts': ['It carries a laser that zaps rocks to study what they are made of.'],
  'st': 'active',
  'where': 'It is driving across Gale crater and climbing the slopes of Mount Sharp on Mars.',
  'now': 'It is still active. Powered by a nuclear battery, it drills rocks, studies the layers of Mount '
         'Sharp and measures weather and radiation to learn how Mars changed from wet to dry.',
  'left': False,
  'ops': True,
  'inst': 'Ten instruments, including cameras (Mastcam, MAHLI), a laser rock zapper (ChemCam), chemistry '
          'labs (SAM, CheMin), a radiation detector (RAD), a weather station (REMS) and a neutron detector '
          '(DAN).',
  'matter': 'It showed that ancient Mars had the water and chemistry that life needs.',
  'legacy': 'Its sky-crane landing system and its findings were reused for Perseverance.'},
 {'id': 'perseverance',
  'name': 'Perseverance and Ingenuity',
  'target': 'mars',
  'year': 2021,
  'image_query': 'Perseverance rover Ingenuity helicopter',
  'summary': 'A rover collecting rock samples for return to Earth, which carried the first helicopter to fly '
             'on another planet.',
  'why': 'NASA wants to find signs of ancient life and prepare samples for future return to Earth.',
  'asked': ['Did life ever exist on Mars?', 'Can we fly aircraft in Mars’s thin air?'],
  'answered': ['Ingenuity proved powered flight is possible on Mars. Perseverance is collecting samples in '
               'Jezero crater.'],
  'team': 'Built and operated by JPL.',
  'outcome': 'Launched July 30, 2020 and landed February 18, 2021. Ingenuity made its first flight on April '
             '19, 2021.',
  'quiz': [{'q': 'What was the helicopter called?',
            'options': ['Ingenuity', 'Sojourner', 'Eagle'],
            'answer': 0},
           {'q': 'Where did Perseverance land?',
            'options': ['Jezero crater', 'Gale crater', 'Chryse Planitia'],
            'answer': 0}],
  'stats': [['Launched', 'July 30, 2020'], ['Landed', 'Feb 18, 2021'], ['Ingenuity flights', '72']],
  'facts': ['Ingenuity was planned for five flights but flew 72 times.'],
  'st': 'active',
  'where': 'Perseverance is exploring Jezero crater on Mars. Ingenuity, the helicopter, rests nearby where '
           'it made its last flight.',
  'now': 'Perseverance is still active, collecting rock samples in sealed tubes for a future return to '
         'Earth. Ingenuity ended its mission in January 2024 after a rotor blade was damaged on flight 72.',
  'left': False,
  'ops': True,
  'inst': 'Cameras (Mastcam-Z), a laser spectrometer (SuperCam), mineral mappers (PIXL and SHERLOC), an '
          'oxygen-making experiment (MOXIE), a ground-penetrating radar (RIMFAX) and a weather station '
          '(MEDA).',
  'matter': 'Its samples may reveal whether life ever existed on Mars, and MOXIE showed oxygen can be made '
            'from Martian air.',
  'legacy': 'Ingenuity opened the door for flying machines on other worlds, and the samples are meant for a '
            'future Mars sample return.'}]
PEOPLE = {'von-braun': {'name': 'Wernher von Braun',
               'born': '1912-03-23',
               'died': '1977-06-16',
               'role': 'Rocket engineer; first director of NASA’s Marshall Space Flight Center',
               'bio': 'Born in Wirsitz, Germany, he led the team that designed the Saturn V, the rocket that '
                      'carried Apollo astronauts to the Moon. He came to the United States after World War '
                      'II and joined NASA in 1960; his earlier work on Germany’s V-2 rocket remains '
                      'controversial.'},
 'armstrong': {'name': 'Neil Armstrong',
               'born': '1930-08-05',
               'died': '2012-08-25',
               'role': 'Astronaut, test pilot, Apollo 11 commander',
               'bio': 'Born in Wapakoneta, Ohio, he was a US Navy pilot and test pilot before joining NASA’s '
                      'astronaut corps in 1962. He commanded Gemini 8 in 1966 and Apollo 11 in 1969, and on '
                      'July 20, 1969 became the first person to walk on the Moon.'},
 'aldrin': {'name': 'Buzz Aldrin',
            'born': '1930-01-20',
            'died': '',
            'role': 'Astronaut, Apollo 11 lunar module pilot',
            'bio': 'Born in Glen Ridge, New Jersey, he earned a doctorate at MIT with a thesis on orbital '
                   'rendezvous, which helped NASA plan how spacecraft meet in orbit. He flew on Gemini 12 in '
                   '1966 and became the second person to walk on the Moon.'},
 'collins': {'name': 'Michael Collins',
             'born': '1930-10-31',
             'died': '2021-04-28',
             'role': 'Astronaut, Apollo 11 command module pilot',
             'bio': 'Born in Rome, Italy, he flew the command module Columbia alone around the Moon while '
                    'Armstrong and Aldrin were on the surface. He also flew on Gemini 10 and later became '
                    'the first director of the National Air and Space Museum.'},
 'kennedy': {'name': 'John F. Kennedy',
             'born': '1917-05-29',
             'died': '1963-11-22',
             'role': '35th President of the United States',
             'bio': 'On May 25, 1961 he asked Congress to commit the nation to landing a man on the Moon and '
                    'returning him safely to Earth before the decade was out, a goal that shaped the entire '
                    'Apollo program. He was assassinated in November 1963, before it was achieved.'},
 'cernan': {'name': 'Eugene Cernan',
            'born': '1934-03-14',
            'died': '2017-01-16',
            'role': 'Astronaut, Apollo 17 commander',
            'bio': 'Born in Chicago, he was a US Navy pilot who flew Gemini 9A and Apollo 10 and commanded '
                   'Apollo 17. He was the last person to walk on the Moon, climbing back into the lunar '
                   'module on December 14, 1972.'},
 'schmitt': {'name': 'Harrison “Jack” Schmitt',
             'born': '1935-07-03',
             'died': '',
             'role': 'Geologist, astronaut, Apollo 17 lunar module pilot',
             'bio': 'Born in Santa Rita, New Mexico, he holds a geology doctorate from Harvard. He was the '
                    'only professional scientist to walk on the Moon and later served as a US senator from '
                    'New Mexico (1977 to 1983).'}}
PEOPLE_OF = {'apollo-11': ['kennedy', 'von-braun', 'armstrong', 'aldrin', 'collins'], 'apollo-17': ['cernan', 'schmitt']}
CONTEXT = {'moon': ['The Moon is Earth’s only natural satellite, about 384,000 km away and roughly a quarter of '
          'Earth’s width. It formed more than four billion years ago, most likely from debris after a '
          'Mars-sized body hit the young Earth, and with no real atmosphere or plate tectonics its surface '
          'keeps a record of the early Solar System.',
          'Studying the Moon teaches scientists how rocky worlds form, and it teaches engineers how to '
          'navigate, land and survive in space. Today NASA’s Artemis program aims to return astronauts to '
          'the lunar surface.'],
 'mars': ['Mars is the fourth planet from the Sun, about half the width of Earth, with a thin carbon dioxide '
          'atmosphere and ice at its poles. Billions of years ago it had rivers and lakes, which makes it '
          'the best nearby place to look for signs of past life. A day on Mars, called a sol, lasts about 24 '
          'hours and 40 minutes.',
          'Each Mars mission builds on the last: flybys showed the surface, orbiters mapped it, landers '
          'touched down, and rovers now drive across it collecting rocks that may one day be brought to '
          'Earth.']}
def data_js():
    parts = [("MISSIONS", MISSIONS), ("PEOPLE", PEOPLE), ("PEOPLE_OF", PEOPLE_OF), ("CONTEXT", CONTEXT)]
    return "\n".join("const %s = %s;" % (k, json.dumps(v)) for k, v in parts)
class Handler(SimpleHTTPRequestHandler):
    def send_body(self, body, ctype):
        raw = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/data.js":
            return self.send_body(data_js(), "text/javascript; charset=utf-8")
        if path == "/api/missions":
            return self.send_body(json.dumps(MISSIONS), "application/json; charset=utf-8")
        return super().do_GET()
if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 9645))
    host = os.environ.get("HOST", "0.0.0.0")
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Open http://localhost:{port}  (Ctrl+C to stop)")
    ThreadingHTTPServer((host, port), Handler).serve_forever()