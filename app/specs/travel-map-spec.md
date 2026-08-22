# Shldr — Interactive Travel Map

## Product Requirements & Technical Specification (v1.0)

## Overview

Build an interactive travel map that visualizes a user's entire travel history. Unlike TripIt, this map should become one of the flagship experiences of Shldr by transforming imported reservations into a living history of where users have been, where they are currently traveling, and where they want to go next.

The map should feel closer to GitHub's contribution graph, Strava's activity map, and Spotify Wrapped than a traditional itinerary viewer.

The implementation must be modular, highly performant, mobile-friendly, and capable of supporting thousands of locations without degrading performance.

---

# Goals

The travel map should allow users to:

* Explore their travel history
* Replay previous trips
* Visualize flight paths
* View visited countries, states, cities, and airports
* Track travel statistics
* View travel heatmaps
* Compare trips across years
* Maintain a travel wishlist
* Share their travel map with others (future)

---

# Technology Stack

## Mapping

* MapLibre GL JS
* react-map-gl/maplibre

MapLibre should be abstracted behind a provider interface so another renderer could be swapped in later if desired.

---

## UI

* Next.js App Router
* React
* TypeScript
* TailwindCSS
* shadcn/ui
* Framer Motion

---

## Geospatial

* Turf.js
* Supercluster
* GeoJSON
* Natural Earth GeoJSON (countries)
* Optional state/province polygon datasets

---

## Data Sources

Travel locations should be automatically generated from imported reservations.

Supported sources include:

* Flights
* Hotels
* Restaurants
* Activities
* Rental Cars
* Cruises
* Rail
* Manual Pins
* Wishlist Locations

Coordinates should be resolved through:

* Google Places
* Airport database
* OpenStreetMap/Nominatim (fallback)
* Existing reservation metadata

Users should rarely need to manually place pins.

---

# Folder Structure

```
components/
    map/
        TravelMap.tsx
        MapProvider.tsx

        layers/
            CountryLayer.tsx
            MarkerLayer.tsx
            FlightLayer.tsx
            ClusterLayer.tsx
            HeatmapLayer.tsx
            WishlistLayer.tsx

        controls/
            TimelineSlider.tsx
            Filters.tsx
            ZoomControls.tsx
            ReplayControls.tsx

        panels/
            Sidebar.tsx
            StatsPanel.tsx
            TripDetails.tsx

        replay/
            TripReplay.tsx

hooks/
    useTravelLocations.ts
    useTravelStats.ts
    useTravelTimeline.ts
    useFlightRoutes.ts
    useVisitedCountries.ts
    useTripReplay.ts

lib/
    map/
        clustering.ts
        geojson.ts
        routes.ts
        statistics.ts
        camera.ts
```

---

# Database

## travel_locations

```
id

userId

tripId

reservationId

type

countryCode

stateCode

city

latitude

longitude

googlePlaceId

airportCode

name

arrivalTime

departureTime

source

createdAt

updatedAt
```

Types

```
hotel

airport

restaurant

activity

museum

poi

car

rail

cruise

custom

wishlist
```

---

## travel_statistics

Materialized analytics table.

```
userId

countriesVisited

statesVisited

citiesVisited

continentsVisited

airportsVisited

hotelsVisited

tripsTaken

distanceFlown

flightHours

nightsAway

favoriteCountry

favoriteCity

favoriteAirport

favoriteAirline

updatedAt
```

---

## country_visits

```
userId

countryCode

visitCount

firstVisit

lastVisit
```

---

## city_visits

```
userId

city

countryCode

visitCount
```

---

## airport_visits

```
userId

airportCode

visitCount
```

---

# Derived Analytics

Automatically regenerate after every reservation import or trip edit.

Calculate:

* Countries visited
* States visited
* Cities visited
* Airports visited
* Total trips
* Flights taken
* Flight hours
* Distance traveled
* Continents visited
* Nights away
* Favorite airline
* Favorite hotel
* Favorite airport
* Favorite destination
* Longest trip
* Average trip length
* Longest flight
* Countries visited this year
* Trips this year

Store results rather than calculating them during every page load.

---

# Travel Map Views

## 1. Explorer View (Default)

The default experience.

Display:

* Visited countries
* Visited states
* Visited cities
* Flight paths
* Trip markers
* Statistics sidebar

Users can click any country to zoom into it.

---

## 2. Timeline View

Interactive year slider.

Example:

```
2018 ─────────────────────── 2026
```

Dragging the slider should:

* Animate visited countries
* Draw flights chronologically
* Fade markers in
* Move the camera automatically
* Update statistics

This should feel like replaying the user's travel history.

---

## 3. Trip Replay

Selecting a trip enters replay mode.

Replay sequence:

Departure Airport

↓

Flight

↓

Arrival Airport

↓

Hotel

↓

Activities

↓

Return Flight

Provide controls:

* Play
* Pause
* Speed
* Timeline scrubber
* Restart

The camera should automatically fly between locations.

---

## 4. Wishlist View

Display destinations users want to visit.

Visited locations:

Blue

Wishlist:

Gray

Support filtering:

* Beaches
* National Parks
* Cities
* Countries
* Restaurants
* Hotels

---

## 5. Heatmap

Visualize travel density.

Areas visited frequently should appear brighter.

Support:

* City heatmap
* Airport heatmap
* Country heatmap

---

## 6. Flight Network

Draw every flight taken.

Flights should render as animated curved arcs.

Hovering a route displays:

* Airline
* Flight number
* Date
* Distance

---

# Filters

Support filtering by:

* Year
* Trip
* Traveler
* Business / Personal
* Country
* Continent
* Transportation Type
* Favorites
* Current Trip
* Completed Trips
* Wishlist

All filters should update the map in real time.

---

# Marker Types

Support custom icons for:

* Hotel
* Airport
* Restaurant
* Activity
* Museum
* Rental Car
* Train Station
* Cruise Port
* Manual Pin
* Wishlist
* Current Location

Markers should cluster automatically when zoomed out.

---

# Flight Routes

Every flight should generate a GeoJSON LineString.

The line should then be converted into a curved bezier arc before rendering.

Support:

* Animation
* Hover state
* Selection state
* Highlight selected trip

Future support:

* Multi-city routes
* Cruises
* Rail routes
* Road trips

---

# Country Layer

Render visited countries using GeoJSON polygons.

Requirements:

* Smooth fill animations
* Hover highlight
* Click to zoom
* Tooltip with:

  * Number of visits
  * First visit
  * Last visit
  * Total days spent

---

# Clustering

Use Supercluster.

Requirements:

* Automatic clustering
* Animated expansion
* Cluster count badges
* Smooth transitions while zooming

The map should comfortably support over 10,000 locations.

---

# Camera System

Support:

* flyTo()
* fitBounds()
* easeTo()
* zoomToTrip()
* zoomToCountry()
* replayCamera()

Camera movement should always animate smoothly.

---

# Statistics Panel

Display summary cards.

Cards include:

* Countries
* Cities
* Trips
* Flights
* Hotels
* Airports
* Distance Traveled
* Nights Away
* Continents
* Airlines

Statistics should update instantly as filters change.

---

# Performance Requirements

Support:

* 10,000+ locations
* 2,000+ markers
* 500+ trips

Requirements:

* 60 FPS animations
* Viewport rendering only
* GeoJSON memoization
* Marker clustering
* Lazy-loaded layers
* Virtualized side panels
* Cached analytics

---

# Hooks

Implement reusable hooks.

```
useTravelLocations()

useTravelStats()

useVisitedCountries()

useVisitedCities()

useFlightRoutes()

useTravelTimeline()

useTripReplay()

useTravelHeatmap()
```

---

# API Design

Create a TravelMapProvider that exposes:

```
TravelMapContext

travelLocations

travelStats

selectedTrip

selectedCountry

timelineYear

filters

cameraController

replayController
```

Business logic should remain independent of the rendering engine.

---

# Future Features

Design the architecture so these can be added without major refactoring.

* 3D globe mode
* Offline downloaded maps
* Shared travel maps
* Compare travel with friends
* Annual "Travel Wrapped"
* AI travel recommendations
* Photo timeline
* Journal entries
* Receipt locations
* Restaurant collections
* UNESCO World Heritage tracking
* National Park tracker
* Travel achievements
* Visa history
* Passport stamp collection
* Airline status tracking
* Carbon footprint analytics

---

# UX Principles

* The map should feel alive and animated.
* Camera movement should always feel smooth and intentional.
* Every interaction should reinforce the user's travel story.
* The map should never feel like a static pin board.
* Mobile interactions should be first-class, not an afterthought.
* Desktop should provide richer hover interactions and advanced filtering.
* Layer visibility should be configurable.
* Dark mode and light mode must be fully supported.

---

# Success Metrics

The feature will be considered complete when:

* Users can visualize every imported trip on an interactive map.
* Flight paths animate smoothly.
* Timeline replay functions across all historical trips.
* Statistics update in real time.
* Marker clustering maintains smooth performance with thousands of locations.
* All map layers are modular and independently extensible.
* The architecture supports future travel analytics without requiring major refactoring.

The travel map should become one of Shldr's signature experiences and provide a compelling reason for users to revisit the app even when they are not actively planning a trip.
