# TrafficJam – Smart Traffic Congestion Dashboard

TrafficJam is a smart traffic monitoring website that helps visualize, search, and analyze real traffic congestion data.
It uses a real CSV dataset to display traffic records, detect busy junctions, identify peak traffic hours, and provide AI-style recommendations for better city flow.

---

## Preview

![TrafficJam Logo](logo.png)

---

## Project Overview

TrafficJam is designed to make traffic data easier to understand through a modern web interface.
The website allows users to explore traffic records, view statistics, filter data, and use a smart AI Organizer to estimate congestion risk based on multiple traffic conditions.

The project focuses on:

* Traffic congestion analysis
* Smart data visualization
* Real-time style dashboard interaction
* AI-based traffic organization suggestions
* Modern responsive web design

---

## Features

### Smart Homepage

* Modern AI-style landing page
* Animated traffic-themed visual design
* Clear navigation
* Responsive layout
* Smooth buttons and UI effects

### Traffic Data Dashboard

* Loads real traffic data from `traffic.csv`
* Displays total traffic records
* Shows number of junctions
* Detects peak vehicle count
* Shows dataset date range
* Search traffic records
* Filter data by junction
* Filter by time window
* Sort records
* View traffic data in a clean table

### Smart Analytics

* Detects the busiest junction
* Finds the busiest traffic hour
* Suggests the best low-traffic time window
* Shows traffic trends using charts
* Provides quick summary cards

### AI Organizer

The AI Organizer helps estimate traffic congestion risk using:

* Selected junction
* Time of day
* Vehicle demand
* Weather condition
* Incident status

It generates:

* Congestion risk score
* Traffic status label
* Smart recommendation
* Suggested action for traffic organization

---

## Tech Stack

### Frontend

* HTML
* CSS
* JavaScript

### Data Handling

* CSV dataset
* PapaParse for CSV loading
* Browser-based processing

### Visualization

* Chart.js
* Dynamic statistics cards
* Interactive data table

---

## Project Structure

```text
TrafficJam/
├── index.html
├── data.html
├── ai.html
├── style.css
├── script.js
├── traffic.csv
├── logo.png
└── README.md
```

---

## Pages

### Home Page

The home page introduces the TrafficJam system and provides quick access to the data dashboard and AI Organizer.

### Traffic Data Page

The data page displays the traffic dataset with search, filters, statistics, and traffic insights.

### AI Organizer Page

The AI Organizer page allows users to simulate traffic conditions and receive smart congestion recommendations.

---

## How to Run

Because the project loads a CSV file, it should be opened using a local server.

### Recommended Method: VS Code Live Server

1. Open the project folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Click **Open with Live Server**.
5. Use the navigation menu to open the Data page and AI Organizer.

---

## Dataset

The project uses `traffic.csv` as the main dataset.
The data is loaded directly in the browser and used to generate statistics, tables, filters, and traffic insights.

---

## Future Improvements

* Add real-time traffic API integration
* Add map-based congestion visualization
* Add machine learning traffic prediction
* Add user location support
* Add export options for filtered data
* Add more advanced AI traffic recommendations

---

## Status

TrafficJam is a completed smart traffic dashboard prototype with real dataset support, interactive filtering, traffic analytics, and AI-style congestion organization.
