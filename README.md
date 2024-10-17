# Ticket Dashboard

## Overview
Ticket Dashboard is a web application that integrates with **OpenSearch on DigitalOcean** to manage and retrieve ticket data. It also leverages **DigitalOcean's GenAI product** to enable AI-powered chat interactions, making the app interactive and efficient. 

## This app is just a demo and intended for educational purposes only.

---

## Features
- **OpenSearch Integration:**  
  Retrieve and display ticket data (open, resolved, and total tickets) from your OpenSearch instance hosted on DigitalOcean.

- **GenAI Chat Integration:**  
  Use DigitalOcean’s GenAI product to engage in chat-based interactions within the application.

- **Examples File:**  
  An example JSON file has been added to **`examples/tickets-10-24.json`** to replicate the data structure used in the app. This can be used for testing and development purposes.

---

## Prerequisites
1. **Node.js** (v14+)
2. **Next.js** (14.2.15 or later)
3. **DigitalOcean Account** with:
   - OpenSearch service access
   - GenAI product access

---

## Environment Variables
Create a `.env.local` file in the root directory with the following content: