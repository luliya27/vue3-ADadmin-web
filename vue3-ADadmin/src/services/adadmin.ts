// src/services/adadmin.ts
import http from './http'

// 登入所需的資料結構
export interface LoginPayload {
  username: string
  password: string
}
// 登入回應的資料結構
export interface LoginResponse {
  success: boolean
  token: string
  user: {
    username: string
    display_name: string
  }
}

// 登入函式
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await http.post('/api/auth/login', payload)
  return res.data
}

// 使用者資料結構
export type UserItem = {
  id: number
  username: string
  display_name: string
  email: string
  department: string | null
  ou: string | null
  ouname: string | null
  groupsname: string | null
  status: 'active' | 'locked' | 'disabled'
  last_login_at: string | null
}
// 組織單位資料結構
export type OuItem = {
  id: number
  ou_dn: string
  ouname: string
  description: string
}
// 群組資料結構
export type GroupItem = {
  groupname: string
  description: string
  grouptype: string
}

// 建立使用者函式
export async function createUser(payload: {
  username: string
  display_name: string
  email: string
  passwordHash: string
  department: string | null
  ou: string | null
  groupsname: string | null
  status: 'active' | 'disabled'
}): Promise<void> {
  await http.post('/api/users', payload)
}

export async function updateUser(id: number, payload: Partial<{
  username: string
  display_name: string
  email: string
  passwordHash: string
  department: string | null
  ou: string | null
  groupsname: string | null
  status: 'active' | 'locked' | 'disabled'
}>): Promise<void> {
  await http.patch(`/api/users/${id}`, payload)
}

export async function deleteUser(id: number): Promise<void> {
  await http.delete(`/api/users/${id}`)
}

// ✅ locked → active
export async function unlockUser(id: number): Promise<void> {
  await http.patch(`/api/users/${id}/unlock`)
}

/* ---------- 使用者管理 ---------- */
// 使用者資料結構: active, locked, disabled
export type UserStatus = 'active' | 'locked' | 'disabled'

// 使用者資料介面
export interface User {
  id: number              // 👈 新增：id（用於刪除、修改）
  username: string
  display_name: string
  email: string
  department?: string
  // ou?: string | null         // user_lists 裡原本存的 DN
  ou_dn?: string | null         // 從 ous join 出來（其實會跟 ou 一樣）
  ouname?: string | null        // 👈 新增：OU 顯示名稱
  groupsname?: string | null    // 👈 新增：群組文字（逗號分隔）
  status: UserStatus
  last_login_at?: string | null
}
// 使用者列表回應結構
export interface UsersResponse {
  success: boolean
  data: User[]
}
// 取得使用者列表函式
export async function fetchUsers(): Promise<User[]> {
  const res = await http.get<UsersResponse>('/api/users')
  return res.data.data
}
// 取得特定群組的使用者列表函式
export async function fetchGroupMembers(groupname: string): Promise<User[]> {
  const res = await http.get<UsersResponse>(
    `/api/groups/${encodeURIComponent(groupname)}/users`,
  )
  return res.data.data
}

// 之後你可以在這個檔案繼續新增其他與 AD Admin 後端 API 互動的函式。
// 例如：新增使用者、更新使用者資料、刪除使用者等。


// 🔍 單一使用者詳細資訊
export async function fetchUser(username: string): Promise<User> {
  const res = await http.get<{ success: boolean; data: User }>(`/api/users/${username}`)
  return res.data.data
}

// 🔧 更新使用者狀態
export async function updateUserStatus(
  username: string,
  status: UserStatus,
): Promise<User> {
  const res = await http.patch<{ success: boolean; data: User }>(
    `/api/users/${username}/status`,
    { status },
  )
  return res.data.data
}

/* ---------- 群組管理 ---------- */
/* ---------- 群組管理 ---------- */
// 群組資料結構: security-global, security-domainlocal, security-universal, distribution
export type GroupType =
  | 'security-global'
  | 'security-domainlocal'
  | 'security-universal'
  | 'distribution'

export interface Group {
  id: number
  groupname: string
  description?: string
  grouptype: GroupType
}

export interface GroupsResponse {
  success: boolean
  data: Group[]
}

// 前端用的篩選類別（✅ 增加 security 群組聚合）
export interface GroupQuery {
  q?: string
  type?: 'all' | 'security' | 'distribution' | GroupType
}

export async function fetchGroups(params?: GroupQuery): Promise<Group[]> {
  const query: Record<string, string> = {}

  if (params?.q) query.q = params.q
  if (params?.type && params.type !== 'all') {
    query.type = params.type
  }

  const res = await http.get<GroupsResponse>('/api/groups', { params: query })
  return res.data.data
}

// ✅ 建立群組
export async function createGroup(payload: {
  groupname: string
  description?: string
  grouptype: GroupType
}): Promise<Group> {
  const res = await http.post<{ success: boolean; data: Group }>('/api/groups', payload)
  return res.data.data
}

// ✅ 更新群組
export async function updateGroup(
  id: number,
  payload: Partial<{ groupname: string; description: string; grouptype: GroupType }>,
): Promise<Group> {
  const res = await http.patch<{ success: boolean; data: Group }>(`/api/groups/${id}`, payload)
  return res.data.data
}

// ✅ 刪除群組
export async function deleteGroup(id: number): Promise<void> {
  await http.delete(`/api/groups/${id}`)
}

/* ---------- OU 管理 ---------- */
// 組織部門類型: organization, department, team, other
export type OuType = 'organization' | 'department' | 'team' | 'other'
export interface Ou {
  id?: string | number
  ou_dn: string
  ouname: string
  description?: string
  ou_type?: OuType
  parentou?: number
  parent_id?: string | null
  parent_dn?: string | null
}

export interface OusResponse {
  success: boolean
  data: Ou[]
}

export interface OuQuery {
  q?: string
}

// 取得組織單位列表函式
export async function fetchOus(params?: OuQuery): Promise<Ou[]> {
  const query: Record<string, string> = {}
  if (params?.q) query.q = params.q

  const res = await http.get<OusResponse>('/api/ous', { params: query })
  return res.data.data
}

// 建立 OU
export async function createOu(payload: {
  parentOuName: string
  childOuName?: string
  description: string
}): Promise<Ou> {
  const res = await http.post<{ success: boolean; data: Ou }>('/api/ous', payload)
  return res.data.data
}

// 更新 OU
export async function updateOu(
  id: string | number,
  payload: {
    description?: string
    ouname?: string
    ou_dn?: string
  }
): Promise<Ou> {
  const res = await http.patch<{ success: boolean; data: Ou }>(`/api/ous/${id}`, payload)
  return res.data.data
}

// 刪除 OU
export async function deleteOu(id: string | number): Promise<void> {
  await http.delete(`/api/ous/${id}`)
}
/* ---------- 電腦管理 ---------- */
// 電腦資料結構
export type Computer = {
  id: number
  cpname: string
  os: string
  ouname: string | null
  ou_id: number | null
  DomainMembershipStatus: 'Joined' | 'LeftDomain' | 'NotJoined'
  ConnectivityStatus: 'Online' | 'Offline' | 'LockedOut'
  ComputerAccount_inADStatus: 'Enabled' | 'Disabled' | 'Unused'
  created_at?: string
  updated_at?: string
}

// 取得電腦列表函式
export async function fetchComputers(params?: {
  q?: string
  domain?: string
  conn?: string
  acc?: string
}): Promise<Computer[]> {
  const cleaned: Record<string, string> = {}

  if (params?.q?.trim()) cleaned.q = params.q.trim()
  if (params?.domain) cleaned.domain = params.domain
  if (params?.conn) cleaned.conn = params.conn
  if (params?.acc) cleaned.acc = params.acc

  const res = await http.get('/api/computers', { params: cleaned })
  return res.data.data
}


// 建立電腦
export async function createComputer(payload: Partial<Computer>) {
  return http.post('/api/computers', payload)
}

// 更新電腦
export async function updateComputer(id: number, payload: Partial<Computer>) {
  return http.patch(`/api/computers/${id}`, payload)
}

// 刪除電腦
export async function deleteComputer(id: number) {
  return http.delete(`/api/computers/${id}`)
}

/* ---------- ad系統設定 ---------- */
export interface AdSettings {
  id: number
  companyname: string
  teamname: string
  syslogo: string | null
  sysbackgroundimg: string | null
  sysaccount: string
  syspasswd: string
  domainname: string
  dc_dn: string
  ip: string
  subnetmask: string
  defaultgateway: string
  preferredDNSserver: string
  secondaryDNSserver: string | null
}

interface AdSettingsResponse {
  success: boolean
  data: AdSettings
}

export async function fetchAdSettings(): Promise<AdSettings> {
  const res = await http.get<AdSettingsResponse>('/api/adsettings')
  return res.data.data
}

export async function updateAdSettings(payload: AdSettings): Promise<void> {
  await http.put('/api/adsettings', payload)
}

/* ---------- 檔案上傳 ---------- */
export async function uploadFile(file: File, field: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('field', field);

  const res = await http.post('/api/upload', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data.url; // 回傳檔案網址
}
