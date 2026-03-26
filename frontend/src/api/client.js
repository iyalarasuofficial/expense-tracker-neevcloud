import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http:

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const groupsAPI = {
  getAll: () => client.get('/groups'),
  getById: (id) => client.get(`/groups/${id}`),
  create: (name) => client.post('/groups', { name }),
}

export const membersAPI = {
  getByGroup: (groupId) => client.get(`/members/group/${groupId}`),
  create: (groupId, name) => client.post('/members', { groupId, name }),
}

export const expensesAPI = {
  getByGroup: (groupId) => client.get(`/expenses/group/${groupId}`),
  create: (data) => client.post('/expenses', data),
}

export const settlementsAPI = {
  getByGroup: (groupId) => client.get(`/settlements/group/${groupId}`),
  create: (data) => client.post('/settlements', data),
}

export default client
