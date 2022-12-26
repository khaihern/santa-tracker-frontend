const santaController = (() => {
  let currTime, santaPos, trackerData, routeData, daysAdding;
  let prevMarker, currMarker, prevLat, prevLng, currLat, currLng;
  let locationResponse, locationData;

  let currDate = new Date();
  // daysAdding = Math.floor(new Date(currDate.getTime() - new Date(1577181600000).getTime()) / (1000 * 3600 * 24)); // number of days from dec 24th 2019 to today
  daysAdding = Math.floor(new Date(currDate.getTime() - new Date(1577181600000).getTime()) / (1000 * 3600 * 24)); // number of days from dec 24th 2019 to today

  // calculate differences between two time
  const calcTimeDiff = (time1, time2) => {
    let diff = time1 - time2;
    diff = Math.abs(diff);
    diff = Math.floor(diff / 1000);
    return diff;
  };

  // create a function that add number of days to a date
  const addDays = (date, days) => {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  santaPos = {
    prevLocation: '',
    nextLocation: '',
    region: '',
    currMode: '',
    timeNext: '',
    orderID: null,
    presentsDelivered: 0,
    photos: [],
  };

  const updateSantaPos = (prevLocation, nextLocation, region, currMode, timeNext, orderID, presentsDelivered, photos) => {
    santaPos.prevLocation = prevLocation;
    santaPos.nextLocation = nextLocation;
    santaPos.region = region;
    santaPos.currMode = currMode;
    santaPos.timeNext = timeNext;
    santaPos.orderID = orderID;
    santaPos.presentsDelivered = presentsDelivered;
    santaPos.photos = photos;
  };

  const plotCoords = async (index) => {
    let lat = routeData[index]['location']['lat'],
      lng = routeData[index]['location']['lng'],
      city = routeData[index > 0 ? (index -= 1) : (index = 0)]['city'],
      region = routeData[index]['region'],
      photoUrl = routeData?.[index]?.['details']?.['photos']?.[0]?.['url'];

    // if (prevLat !== undefined) {
    //   map.removeLayer(currMarker);
    // }
    // currMarker = L.marker([lat, lng], { riseOnHover: true, icon: santaIcon, zIndexOffset: 1000 }).addTo(map);
    if (prevLat !== undefined) {
      currLat = lat;
      currLng = lng;
      currMarker.remove();
    }

    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
            properties: {
              'marker-size': 'small'
            }
          },
        },
      ],
    };

    const el = document.createElement('div');
    el.className = 'santaStatus';
    el.style.width = `100px`;
    el.style.height = `100px`;
    currMarker = new mapboxgl.Marker(el).setLngLat(geojson.features[0].geometry.coordinates).addTo(map);

    const giftsCount = document.createElement('div');
    giftsCount.className = 'giftsCount';
    giftsCount.innerHTML = '<span class="material-icons">redeem</span><h1></h1>';
    document.querySelector('.santaStatus').appendChild(giftsCount);

    map.flyTo({
      center: [lng, lat],
      zoom: 4,
      essential: true,
    });

    if (prevLat !== undefined) {
      let desc = locationData[index]['extract'];
      let scratchUsers = locationData[index]['scratchUsers'];
      // console.log(scratchUsers);

      // function to shorten a string to 3 lines
      function truncate(str, n, useWordBoundary) {
        if (str.length <= n) {
          return str;
        }
        const subString = str.substr(0, n - 1); // the original check
        return (useWordBoundary ? subString.substr(0, subString.lastIndexOf(' ')) : subString) + '&hellip;';
      }

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnMove: true }).setHTML(
        `<div class="locationPopup__photo" style="background-image: url(${photoUrl});"></div><div class="locationPopup__content"><h2 class="locationPopup__name">${city}, ${region}</h2><h3 class="locationPopup__desc">${truncate(
          desc,
          120,
          true
        )}</h3><h2 class="locationPopup__usersLabel">Scratchers in the Region:</h2><div class="locationPopup__users">
          <a href="https://scratch.mit.edu/users/${scratchUsers[0]['username']}" target="_blank"><img title="${scratchUsers[0]['username']}" class="locationPopup__user" src="${scratchUsers[0].profileIcon}" alt="${scratchUsers[0]['username']}"></a>
          <a href="https://scratch.mit.edu/users/${scratchUsers[1]['username']}" target="_blank"><img title="${scratchUsers[1]['username']}" class="locationPopup__user" src="${scratchUsers[1].profileIcon}" alt="${scratchUsers[1]['username']}"></a>
          <a href="https://scratch.mit.edu/users/${scratchUsers[2]['username']}" target="_blank"><img title="${scratchUsers[2]['username']}" class="locationPopup__user" src="${scratchUsers[2].profileIcon}" alt="${scratchUsers[2]['username']}"></a>
          <a href="https://scratch.mit.edu/users/${scratchUsers[3]['username']}" target="_blank"><img title="${scratchUsers[3]['username']}" class="locationPopup__user" src="${scratchUsers[3].profileIcon}" alt="${scratchUsers[3]['username']}"></a>
          <a href="https://scratch.mit.edu/users/${scratchUsers[4]['username']}" target="_blank"><img title="${scratchUsers[4]['username']}" class="locationPopup__user" src="${scratchUsers[4].profileIcon}" alt="${scratchUsers[4]['username']}"></a>
        </div></div>`
      );

      //prevMarker = L.marker([prevLat, prevLng], { riseOnHover: true, icon: regularIcon, zIndexOffset: 0 }).addTo(map);
      prevMarker = new mapboxgl.Marker({ color: '#D85748', scale: 0.75, cursor: 'pointer' })
        .setLngLat([routeData[index]['location']['lng'], routeData[index]['location']['lat']])
        .setPopup(popup)
        .addTo(map);
    }

    prevLat = lat;
    prevLng = lng;
  };

  return {
    getRouteAPI: async () => {
      const response = await fetch(
        'https://firebasestorage.googleapis.com/v0/b/santa-tracker-firebase.appspot.com/o/route%2Fsanta_en.json?alt=media'
      );
      trackerData = await response.json();
      routeData = trackerData.destinations;
      return routeData;
    },

    getLocationData: async () => {
      locationResponse = await fetch('./locationData.json');
      locationData = await locationResponse.json();
      return;
    },

    findArrTime: async () => {
      let response, data, closestLocation, closestLocDistance;
      response = await fetch('https://ipgeolocation.abstractapi.com/v1/?api_key=4b552c45f7c7415db90b58a7e20ee6c0');
      data = await response.json();

      let lat = data['latitude'];
      let lng = data['longitude'];
      //console.log(lat + ',' + lng)

      closestLocDistance = '';

      Number.prototype.toRad = function () {
        return (this * Math.PI) / 180;
      };

      for (let i = 1; i < routeData.length; i++) {
        let lat2 = routeData[i]['location']['lat'];
        let lon2 = routeData[i]['location']['lng'];
        let lat1 = lat;
        let lon1 = lng;

        const R = 6371; // km
        //has a problem with the .toRad() method below.
        let x1 = lat2 - lat1;
        let dLat = x1.toRad();
        let x2 = lon2 - lon1;
        let dLon = x2.toRad();
        let a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let d = R * c;

        if (d < closestLocDistance || closestLocDistance === '') {
          closestLocation = i;
          closestLocDistance = d;
        }
      }

      let addArrival = addDays(routeData[closestLocation]['arrival'], daysAdding);
      return addArrival;
    },

    getSantaPos: () => {
      let addArrival, addDeparture;

      let currTime = new Date().toUTCString();
      addDeparture = addDays(new Date(routeData[0]['departure']), daysAdding);

      let photos = [];

      // check if santa departed
      if (Date.parse(currTime) < Date.parse(addDeparture)) {
        let timeToTakeoff = calcTimeDiff(Date.parse(currTime), Date.parse(addDeparture));
        //console.log(`Santa has not take off yet! Santa will takeoff in ${timeToTakeoff} minutes`);

        //Grab photos
        photos = [];
        routeData[0]['details']['photos'].forEach((el) => {
          photos.push(el['url']);
        });

        updateSantaPos(
          routeData[0]['city'],
          routeData[0]['city'],
          routeData[0]['region'],
          'Pitstop',
          Date.parse(addDeparture),
          0,
          routeData[0]['presentsDelivered'],
          photos,
        );
        return santaPos;
      }
      plotCoords(0);

      for (let i = 1; i < routeData.length; i++) {
        addArrival = addDays(new Date(routeData[i]['arrival']), daysAdding);
        addDeparture = addDays(new Date(routeData[i]['departure']), daysAdding);
        if (Date.parse(currTime) < Date.parse(addArrival)) {
          //console.log(`Santa has left ${routeData[i-1]['city']} and heading to ${routeData[i]['city']}`);
          
          //Grab photos
          photos = [];
          routeData[i]['details']['photos'].forEach((el) => {
            photos.push(el['url']);
          });
          
          updateSantaPos(
            routeData[i - 1]['city'],
            routeData[i]['city'],
            routeData[i - 1]['region'],
            'Airborne',
            Date.parse(addArrival),
            i,
            routeData[i - 1]['presentsDelivered'],
            photos
          );
          plotCoords(i);
          //setViewBox(routeData[i]['location']['lat'], routeData[i]['location']['lng']);
          return santaPos;
        } else if (Date.parse(currTime) < Date.parse(addDeparture)) {
          //console.log(`Santa is currently at ${routeData[i]['city']} delivering presents`);

          //Grab photos
          photos = [];
          routeData[i]['details']['photos'].forEach((el) => {
            photos.push(el['url']);
          });

          updateSantaPos(
            routeData[i]['city'],
            routeData[i + 1]['city'],
            routeData[i]['region'],
            'Pitstop',
            Date.parse(addDeparture),
            i,
            routeData[i]['presentsDelivered'],
            photos
          );
          // setViewBox(routeData[i]['location']['lat'], routeData[i]['location']['lng']);
          return santaPos;
        }
        plotCoords(i + 1);
        //if before arrival
        //return status
        //else if before departure
        //return status
      }
      //console.log(`${routeData[santaPos.orderID]['location']['lat']}, ${routeData[santaPos.orderID]['location']['lng']}`)
    },

    getNextPos: () => {
      let addArrival, addDeparture, photos = [];
      if (santaPos.currMode == 'Airborne') {
        plotCoords(santaPos.orderID);
        addDeparture = addDays(new Date(routeData[santaPos.orderID]['departure']), daysAdding);

        //Grab photos
        routeData[santaPos.orderID]['details']['photos'].forEach((el) => {
          photos.push(el['url']);
        });

        updateSantaPos(
          santaPos.nextLocation,
          routeData[santaPos.orderID + 1]['city'],
          routeData[santaPos.orderID]['region'],
          'Pitstop',
          Date.parse(addDeparture),
          santaPos.orderID,
          routeData[santaPos.orderID]['presentsDelivered'],
          photos
        );
      } else if (santaPos.currMode == 'Pitstop') {
        plotCoords(santaPos.orderID);
        addArrival = addDays(new Date(routeData[santaPos.orderID + 1]['arrival']), daysAdding);

        //Grab photos
        routeData[santaPos.orderID + 1]['details']['photos'].forEach((el) => {
          photos.push(el['url']);
        });

        updateSantaPos(
          santaPos.prevLocation,
          routeData[santaPos.orderID + 1]['city'],
          routeData[santaPos.orderID]['region'],
          'Airborne',
          Date.parse(addArrival),
          santaPos.orderID + 1,
          routeData[santaPos.orderID + 1]['presentsDelivered'],
          photos
        );
      }
    },

    getSantaMarker: () => {
      return { currMarker, 
              currLat, 
              currLng, 
              previousLatitude: routeData[santaPos.orderID - 1]['location']['lat'], 
              previousLongitude: routeData[santaPos.orderID - 1]['location']['lng']};
    },

    drawRecentRoute: (orderID) => {
      let coordinates = [];
      let coordinatePair = [];

      for (let i = 0; i < 20; i++) {
        coordinatePair = [routeData[orderID - 1 - i]['location']['lng'], routeData[orderID - 1 - i]['location']['lat']];
        coordinates.push(coordinatePair);
      }

      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: '',
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        ],
      };

      // function that create lighter shades of a color, written by copilot
      function shadeColor(color, percent) {
        let f = parseInt(color.slice(1), 16),
          t = percent < 0 ? 0 : 255,
          p = percent < 0 ? percent * -1 : percent,
          R = f >> 16,
          G = (f >> 8) & 0x00ff,
          B = f & 0x0000ff;
        return (
          '#' +
          (
            0x1000000 +
            (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B)
          )
            .toString(16)
            .slice(1)
        );
      }

      if (map.getLayer('route')) {
        map.removeLayer('route');
        map.removeSource('route');
      }

      map.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          lineMetrics: true,
          data: geojson.features[0],
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#39AA59',
          'line-width': 2,
          'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#39AA59', 1, shadeColor('#39AA59', 0.75)],
        },
      });
    },

    getEquidistantCoordinates: () => {
      // Convert numeric degrees to radians
      Number.prototype.toRad = function() {
        return this * Math.PI / 180;
      }

      // Convert radians to numeric degrees
      Number.prototype.toDeg = function() {
        return this * 180 / Math.PI;
      }

      // n is the number of points created for every second
      const n = Math.abs((new Date(santaPos.timeNext).getTime() - addDays(routeData[santaPos.orderID - 1]['departure'], daysAdding)) / 1000);

      const startCoords = routeData[santaPos.orderID - 1]['location'];
      const endCoords = routeData[santaPos.orderID]['location'];

      console.log(startCoords);
      console.log(endCoords);
      const points = [];
      const R = 6371; // radius of Earth in kilometers
      const dLat = (endCoords.lat - startCoords.lat).toRad();
      const dLon = (endCoords.lng - startCoords.lng).toRad();
      const lat1 = startCoords.lat.toRad();
      const lat2 = endCoords.lat.toRad();
  
      for (let i = 0; i <= n; i++) {
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.sin(dLon / 2) * Math.sin(dLon / 2) *
                  Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c * 1000; // distance in meters
        const fraction = i / n;
        const lat3 = lat1 + fraction * dLat;
        const lon3 = startCoords.lng.toRad() + fraction * dLon;
        points.push({
          lat: lat3.toDeg(),
          lng: lon3.toDeg()
        });
      }
  
      return points;
    }
  };
})();

const uiController = (() => {
  const DOMstrings = {
    routeValues: '.route__values',
    modeLabels: '.mode__labels',
    modeValues: '.mode__values',
    timeLabels: '.time__labels',
    timeValues: '.time__values',
    santaStatus: '.santaStatus',
    giftsCount: '.giftsCount',
    scratcherValues: '.scratcher-values',
    scratcherList: '.scratcher-list',
    headerTime: '#header-item1',
    headerLoc: '#header-item2',
    status: '.status',
    photosList: '.photos__list',
    photoCity: '.photos__location',
    media: '.media',
    mediaLabels: '.media__labels',
    mediaCTA: '.media__cta'
  };

  let bounce = false; //animating the santa up and down

  const countDown = (endDate, domString, pointsAlongRoute, santaLocation) => {
    
    let santaAutoTrack = true;
    //if it's counting down the time at a pitstop
    if (domString == 'timeValues' && pointsAlongRoute.length == 0) {
      bounce = true;
      uiController.animateSanta(santaLocation.currMarker, santaLocation.currLat, santaLocation.currLng, santaLocation.previousLatitude, santaLocation.previousLongitude);
    } else if (domString == 'timeValues') {
      map.on('dragstart', function() {
        console.log('Drag started');
        santaAutoTrack = false;
      });
    }

    return new Promise((resolve, reject) => {
      let countDownDate = new Date(endDate);
      let x = setInterval(() => {
        let now = new Date().getTime();

        if (domString == 'routeValues' && countDownDate.getTime() < now) {
          //console.log('over');
          resolve('done');
          clearInterval(x);
        }

        let distance = countDownDate - now;
        let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((distance % (1000 * 60)) / 1000);

        //if it's counting down the time when it's airborne
        if (domString == 'timeValues' && pointsAlongRoute.length != 0) {
          bounce = false;
          uiController.animateSanta(santaLocation.currMarker, pointsAlongRoute[pointsAlongRoute.length - 1 - Math.floor(Math.abs((countDownDate - now)) / 1000)]['lat'], pointsAlongRoute[pointsAlongRoute.length - 1 - Math.floor(Math.abs((countDownDate - now) / 1000))]['lng'], santaLocation.previousLatitude, santaLocation.previousLongitude, santaAutoTrack);
        }

        //console.log(seconds)
        minutes = (minutes < 10 ? '0' : '') + minutes;
        seconds = (seconds < 10 ? '0' : '') + seconds;

        if (domString == 'timeValues') {
          if (hours < 1) {
            document.querySelector(DOMstrings.timeValues).innerHTML = `${minutes}:${seconds}`;
          } else {
            document.querySelector(DOMstrings.timeValues).innerHTML = `${hours}:${minutes}:${seconds}`;
          }
        } else if (domString == 'routeValues') {
          document.querySelector(DOMstrings.routeValues).innerHTML = `${hours} Hours ${minutes} Minutes`;
        }

        if (distance <= 0) {
          resolve('done');
          clearInterval(x);
        }
      }, 1000);
    });
  };

  const removeAllChildren = (parent) => {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  };

  return {
    updateRoute: async (santaPos, pointsAlongRoute, santaLocation) => {
      document.querySelector(DOMstrings.headerLoc).innerHTML = `${santaPos.prevLocation}, ${santaPos.region}`;

      if (santaPos.currMode == 'Airborne') {
        document.querySelector(DOMstrings.modeLabels).innerHTML = 'Heading To';
        document.querySelector(DOMstrings.modeValues).innerHTML = santaPos.nextLocation;
        document.querySelector(DOMstrings.timeLabels).innerHTML = 'Arriving In';
        await countDown(santaPos.timeNext, 'timeValues', pointsAlongRoute, santaLocation);
        //console.log('after');
        return;
      } else if (santaPos.currMode == 'Pitstop') {
        document.querySelector(DOMstrings.modeLabels).innerHTML = 'Current Stop';
        document.querySelector(DOMstrings.modeValues).innerHTML = santaPos.prevLocation;
        document.querySelector(DOMstrings.timeLabels).innerHTML = 'Departing In';
        document.querySelector(DOMstrings.timeValues).innerHTML = 'No Data';
        await countDown(santaPos.timeNext, 'timeValues', [], santaLocation);
        //console.log('after pitstop');
        return;
      }
    },

    updateStatus: (santaPos) => {
      if (santaPos.currMode == 'Airborne') {
        try {
          document.querySelector(DOMstrings.santaStatus).classList.add('santa_sleigh');
          document.querySelector(DOMstrings.santaStatus).classList.remove('santa_gifts');
        } catch (error) {}
      } else if (santaPos.currMode == 'Pitstop') {
        try {
          document.querySelector(DOMstrings.santaStatus).classList.add('santa_gifts');
          document.querySelector(DOMstrings.santaStatus).classList.remove('santa_sleigh');
        } catch (error) {}
      }
    },

    updatePhotos: (santaPos) => {
      //Clear out all the previous photos
      document.querySelector(DOMstrings.photosList).innerHTML = ' ';

      //For each photos in list, add a card to the html, not to exceed 4 cards
      let new_li = document.createElement('li');
      new_li.className = 'photos__card';
      santaPos.photos.every((el, index) => {
        document.querySelector(DOMstrings.photosList).appendChild(new_li.cloneNode(true));
        if (index == 3) {
          return false;
        } else {
          return true;
        }
      });

      //Changing the image of the photos cards
      let photoCards = document.querySelector(DOMstrings.photosList).childNodes;
      let photoIndex = 0;
      for (let i = 0; i < photoCards.length; i++) {
        if (photoCards[i].nodeName.toLowerCase() == 'li') {
          photoCards[i].style.backgroundImage = `url(${santaPos.photos[photoIndex]})`;
          photoIndex += 1;
        }
      }

      //Write the location of the photos
      document.querySelector(DOMstrings.photoCity).innerHTML = `${santaPos.currMode == 'Pitstop' ? santaPos.prevLocation : santaPos.nextLocation}`;
    },

    updateMedia: () => {
      setInterval(() => {
        //ID of the Scratch Projects
        let animations = [273343061, 462774091, 466337394, 89025005, 459737643, 461648228, 462911474, 226034200, 223108087, 222533289, 219473703, 211310654, 217423939, 227657131, 212304322, 213506011, 208710981, 222655860, 92500368, 274070991, 190011244, 269060133, 355074630, 41206644, 467357045];
        let games = [137651951, 86359934, 192335511, 268933200, 265577662, 90914721, 272045498, 779552593, 349373793, 272953349, 193803200, 604421910, 620253799, 190350611, 611541710, 481290805, 38403214, 447015016, 191573221, 596470087, 15075951, 456024949, 306432816, 461334001, 452209527, 269148884, 621337245, 190343215, 355747998, 37523030, 2998709, 273304778, 608139762, 574870481, 765399719];
      
        //Seed the random number generator using the current UTC minute, so everyone generates the same random project
        Math.seedrandom(new Date().getUTCMinutes());

        let projectId;
        if (new Date().getUTCMinutes() % 2 == 0) { //If the minute is even, then pick a game
          projectId = games[Math.floor(Math.random() * games.length)];
          document.querySelector(DOMstrings.mediaLabels).innerHTML = '• Play Christmas Game';
          document.querySelector(DOMstrings.mediaCTA).innerHTML = 'sports_esports';
        } else { //else pick an animation
          projectId = animations[Math.floor(Math.random() * animations.length)];
          document.querySelector(DOMstrings.mediaLabels).innerHTML = '• Watch Christmas Animation';
          document.querySelector(DOMstrings.mediaCTA).innerHTML = 'play_arrow';
        }

        document.querySelector(DOMstrings.media).style.backgroundImage = `radial-gradient(circle, transparent, rgba(0, 0, 0, 0.3)), url(https://cdn2.scratch.mit.edu/get_image/project/${projectId}_480x360.png)`;
        document.querySelector(DOMstrings.mediaCTA).parentElement.setAttribute('href', `https://scratch.mit.edu/projects/${projectId}/fullscreen/`);
      }, 1000);
    },

    updateTime: () => {
      let x = setInterval(() => {
        let time, hour, minute, timeOfDay, timeString;
        time = new Date();
        hour = time.getHours();
        minute = time.getMinutes();
        minute = (minute < 10 ? '0' : '') + minute;
        timeOfDay = hour < 12 ? 'AM' : 'PM';
        hour = hour > 12 ? hour - 12 : hour;
        hour = hour == 0 ? 12 : hour;
        timeString = `${hour}:${minute} ${timeOfDay}`;
        document.querySelector(DOMstrings.headerTime).innerHTML = timeString;
      }, 1000);
    },

    updateArrTime: async (arrTime) => {
      await countDown(arrTime, 'routeValues');
      document.querySelector(DOMstrings.routeValues).innerHTML = 'Arrived';
    },

    updateGiftsCount: (timeNext, presentsDelivered, currAmtGifts) => {
      let giftsAdded = Math.round((presentsDelivered - currAmtGifts) / ((timeNext - new Date().getTime()) / 2000));
      let total = currAmtGifts + giftsAdded;
      document.querySelector(
        DOMstrings.giftsCount
      ).innerHTML = `<span class="material-icons">redeem</span><h1>${total.toLocaleString('en-US')}</h1>`; // separate thousands with commas
      return total;
    },

    animateSanta: (santaMarker, currLat, currLng, previousLatitude, previousLongitude, santaAutoTrack) => {
      if (bounce) {
        let currRouteData;
        if (!map.getLayer('currRoute')) {
          currRouteData = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: '',
                geometry: {
                  type: 'LineString',
                  coordinates: [[currLng, currLat], [previousLongitude, previousLatitude]],
                },
              },
            ],
          };

          map.addSource('currRouteSource', { type: 'geojson', data: currRouteData });

          map.addLayer({
            id: 'currRoute',
            type: 'line',
            source: 'currRouteSource',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#39AA59',
              'line-width': 2,
            },
          });
        }

        function animate(timestamp) {
          let radius = 1;
          santaMarker.setLngLat([currLng, Math.sin(timestamp / 500) * (radius / map.getZoom()) + currLat]);
          //santaMarker.addTo(map);
          requestAnimationFrame(() => {
            if (bounce == true) { //stop animating up and down when it's airborne (bounce set to false)
              uiController.animateSanta(santaMarker, currLat, currLng);
            }
          });
        }
        requestAnimationFrame(animate);
      } else {
        if (currLat != undefined && currLng != undefined) {
          santaMarker.setLngLat([currLng, currLat]);
          
          let currRouteData;
          
          if (!map.getLayer('currRoute')) {
            currRouteData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: '',
                  geometry: {
                    type: 'LineString',
                    coordinates: [[currLng, currLat], [previousLongitude, previousLatitude]],
                  },
                },
              ],
            };

            map.addSource('currRouteSource', { type: 'geojson', data: currRouteData });

            map.addLayer({
              id: 'currRoute',
              type: 'line',
              source: 'currRouteSource',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#39AA59',
                'line-width': 2,
              },
            });
          } else {
            //console.log(currRouteData);
            //currRouteData.features[0].geometry.coordinates = [[currLng, currLat], [previousLongitude, previousLatitude]];
            map.getSource('currRouteSource').setData({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: '',
                  geometry: {
                    type: 'LineString',
                    coordinates: [[currLng, currLat], [previousLongitude, previousLatitude]],
                  },
                },
              ]
            });
            if (santaAutoTrack) {
              map.panTo([currLng, currLat])
            }
          }
        }
      }
    },
  };
})();

const controller = (async (santaCtrl, uiCtrl) => {
  let routeData, santaPos, scratcherData, arrTime;
  let currAmtGifts = undefined;

  uiCtrl.updateTime();

  routeData = await santaCtrl.getRouteAPI(); // get route data from API
  await santaCtrl.getLocationData();
  //console.log(routeData);
  santaCtrl.findArrTime().then((value) => {
    uiCtrl.updateArrTime(value);
  });

  santaPos = await santaCtrl.getSantaPos(); // get santa position

  let pointsAlongRoute;
  if (santaPos.currMode == 'Airborne') {
    pointsAlongRoute = santaCtrl.getEquidistantCoordinates();
    console.log(pointsAlongRoute);
  }

  uiCtrl.updateStatus(santaPos);
  uiCtrl.updatePhotos(santaPos);
  uiCtrl.updateMedia();
  santaCtrl.drawRecentRoute(santaPos.orderID);

  // setinterval function
  if (currAmtGifts == undefined) {
    currAmtGifts = santaPos.presentsDelivered;
  }
  setInterval(() => {
    currAmtGifts = uiCtrl.updateGiftsCount(santaPos.timeNext, santaPos.presentsDelivered, currAmtGifts);
  }, 2000);

  while (true) {
    let santaLocation = santaCtrl.getSantaMarker();
    //uiCtrl.animateSanta(santaLocation.currMarker, santaLocation.currLat, santaLocation.currLng);
    await uiCtrl.updateRoute(santaPos, pointsAlongRoute, santaLocation);
    await santaCtrl.getNextPos();

    if (santaPos.currMode == 'Airborne') {
      pointsAlongRoute = santaCtrl.getEquidistantCoordinates();
      console.log(pointsAlongRoute);
    }

    uiCtrl.updateStatus(santaPos);
    uiCtrl.updatePhotos(santaPos);
    santaCtrl.drawRecentRoute(santaPos.orderID);
  }
})(santaController, uiController);

mapboxgl.accessToken = 'pk.eyJ1Ijoia2hhaWhlcm4iLCJhIjoiY2t4ajczaTVtMnBoazJva3k4cTMxZDQ0MCJ9.C4RBRggFv5Bv3Eq3XJmvgg';
let map = new mapboxgl.Map({
  container: 'map',
  //style: 'mapbox://styles/khaihern/ckxjzd7zc0qar14o1a3ubj1i4',
  //style: 'mapbox://styles/khaihern/clbzp8ri6001o15peogfztip7', //prod
  //style: 'mapbox://styles/khaihern/clc2sozid002q15qibgox0lp4/draft',
  style: 'mapbox://styles/khaihern/clc2sozid002q15qibgox0lp4',
  center: [40.346, 33.428],
  zoom: 2
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl(), 'top-left');
map.dragRotate.disable(); // disable map rotation using right click + drag
map.touchZoomRotate.disableRotation(); // disable map rotation using touch rotation gesture
