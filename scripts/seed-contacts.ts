import { db } from "../src/db"
import { contacts } from "../src/db/schema"

const sampleContacts = [
  {
    name: "Brian Chesky",
    email: "chesky@airbnb.com",
    companyName: "Airbnb",
    title: "CEO & Co-Founder",
    phone: "+1 123456789",
    city: "San Francisco",
    linkedin: "linkedin.com/in/brianchesky",
    x: "@bchesky",
  },
  {
    name: "Dario Amodei",
    email: "amodei@anthropic.com",
    companyName: "Anthropic",
    title: "CEO & Co-Founder",
    phone: "+1 555123456",
    city: "San Francisco",
    linkedin: "linkedin.com/in/darioamodei",
    x: "@darioamodei",
  },
  {
    name: "Patrick Collison",
    email: "collison@stripe.com",
    companyName: "Stripe",
    title: "CEO & Co-Founder",
    phone: "+1 987625341",
    city: "San Francisco",
    linkedin: "linkedin.com/in/patrickcollison",
    x: "@patrickc",
  },
  {
    name: "Dylan Field",
    email: "field@figma.com",
    companyName: "Figma",
    title: "CEO & Co-Founder",
    phone: "+1 098822619",
    city: "San Francisco",
    linkedin: "linkedin.com/in/dylanfield",
    x: "@dylanfield",
  },
  {
    name: "Ivan Zhao",
    email: "zhao@notion.com",
    companyName: "Notion",
    title: "CEO & Co-Founder",
    phone: "+1 882261739",
    city: "San Francisco",
    linkedin: "linkedin.com/in/ivanzhao",
    x: "@ivanhzhao",
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
