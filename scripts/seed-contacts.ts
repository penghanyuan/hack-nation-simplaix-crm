import { db } from "../src/db"
import { contacts } from "../src/db/schema"

const sampleContacts = [
  {
    name: "Brian Chesky",
    email: "chesky@airbnb.com",
    companyName: "Airbnb",
    title: "CEO & Co-Founder",
  },
  {
    name: "Dario Amodei",
    email: "amodei@anthropic.com",
    companyName: "Anthropic",
    title: "CEO & Co-Founder",
  },
  {
    name: "Patrick Collison",
    email: "collison@stripe.com",
    companyName: "Stripe",
    title: "CEO & Co-Founder",
  },
  {
    name: "Dylan Field",
    email: "field@figma.com",
    companyName: "Figma",
    title: "CEO & Co-Founder",
  },
  {
    name: "Ivan Zhao",
    email: "zhao@notion.com",
    companyName: "Notion",
    title: "CEO & Co-Founder",
  },
]

async function seed() {
  console.log("Seeding contacts...")
  
  try {
    for (const contact of sampleContacts) {
      await db.insert(contacts).values(contact).onConflictDoNothing()
      console.log(`Added: ${contact.name}`)
    }
    
    console.log("✅ Seeding completed successfully!")
  } catch (error) {
    console.error("❌ Error seeding contacts:", error)
    process.exit(1)
  }
}

seed()
