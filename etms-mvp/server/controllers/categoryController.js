const categoryModel = require('../models/categoryModel')
const userModel     = require('../models/userModel')

async function getCategories(req, res) {
  try {
    const rows = await categoryModel.findAll()

    const grouped = {}
    rows.forEach(row => {
      if (!grouped[row.type_key]) {
        grouped[row.type_key] = {
          type_key:   row.type_key,
          type_name:  row.type_name,
          categories: [],
        }
      }
      grouped[row.type_key].categories.push({
        id:               row.id,
        name:             row.name,
        category_key:     row.category_key,
        default_priority: row.default_priority,
        requires_approval: row.requires_approval,
      })
    })

    return res.status(200).json({ success: true, types: Object.values(grouped) })
  } catch (err) {
    console.error('getCategories error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getEmployeesByCategory(req, res) {
  try {
    const categoryId = Number(req.params.categoryId)
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' })
    }

    const employees = await userModel.findEmployeesByCategory(categoryId)
    return res.status(200).json({ success: true, employees })
  } catch (err) {
    console.error('getEmployeesByCategory error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

module.exports = { getCategories, getEmployeesByCategory }
