import { app, ipcMain } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'

let db: Database.Database

export interface Playlist {
  id?: number
  nome: string
  descricao: string
  imagem_capa: string
  data_criacao: string
}

export interface Media {
  id?: number
  playlist_id: number
  nome: string
  tipo: 'imagem' | 'vídeo' | 'áudio'
  caminho_arquivo: string
  duracao: number
  ordem: number
}

export interface Config {
  imagem_ociosa: string
  modo_reproducao: 'manual' | 'automatico' | 'automatico_intervalo' | 'loop'
  intervalo_entre_midias: number
  monitor_selecionado: string
  volume_padrao: number
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'media_manager.db')
  db = new Database(dbPath)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      imagem_capa TEXT,
      data_criacao TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS midias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      caminho_arquivo TEXT NOT NULL,
      duracao INTEGER NOT NULL,
      ordem INTEGER NOT NULL,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      imagem_ociosa TEXT,
      modo_reproducao TEXT NOT NULL DEFAULT 'manual',
      intervalo_entre_midias INTEGER DEFAULT 5,
      monitor_selecionado TEXT,
      volume_padrao REAL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      idle_image_path TEXT,
      ao_finalizar_midia TEXT NOT NULL DEFAULT 'proxima'
    );
  `)

  // Seed default configuration if none exists
  const configExists = db.prepare('SELECT COUNT(*) as count FROM configuracoes').get() as {
    count: number
  }
  if (configExists.count === 0) {
    db.prepare(
      `
      INSERT INTO configuracoes (id, imagem_ociosa, modo_reproducao, intervalo_entre_midias, monitor_selecionado, volume_padrao)
      VALUES (1, '', 'manual', 5, '', 1.0)
    `
    ).run()
  }

  // Seed default settings if none exists
  const settingsExists = db.prepare('SELECT COUNT(*) as count FROM settings').get() as {
    count: number
  }
  if (settingsExists.count === 0) {
    db.prepare(
      `
      INSERT INTO settings (id, idle_image_path, ao_finalizar_midia)
      VALUES (1, '', 'proxima')
    `
    ).run()
  }

  setupIpcHandlers()
}

function setupIpcHandlers(): void {
  // Playlists
  ipcMain.handle('db:get-playlists', () => {
    return db.prepare('SELECT * FROM playlists ORDER BY id DESC').all()
  })

  ipcMain.handle('db:save-playlist', (_, playlist: Playlist) => {
    if (playlist.id) {
      db.prepare(
        `
        UPDATE playlists 
        SET nome = ?, descricao = ?, imagem_capa = ?
        WHERE id = ?
      `
      ).run(playlist.nome, playlist.descricao, playlist.imagem_capa, playlist.id)
      return playlist.id
    } else {
      const result = db
        .prepare(
          `
        INSERT INTO playlists (nome, descricao, imagem_capa, data_criacao)
        VALUES (?, ?, ?, ?)
      `
        )
        .run(playlist.nome, playlist.descricao, playlist.imagem_capa, playlist.data_criacao)
      return result.lastInsertRowid
    }
  })

  ipcMain.handle('db:delete-playlist', (_, id: number) => {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
    return true
  })

  // Mídias
  ipcMain.handle('db:get-medias', (_, playlistId: number) => {
    return db
      .prepare('SELECT * FROM midias WHERE playlist_id = ? ORDER BY ordem ASC')
      .all(playlistId)
  })

  ipcMain.handle('db:save-media', (_, media: Media) => {
    if (media.id) {
      db.prepare(
        `
        UPDATE midias 
        SET nome = ?, tipo = ?, caminho_arquivo = ?, duracao = ?, ordem = ?
        WHERE id = ?
      `
      ).run(media.nome, media.tipo, media.caminho_arquivo, media.duracao, media.ordem, media.id)
      return media.id
    } else {
      // Get next order index if not specified
      let order = media.ordem
      if (order === undefined || order === null) {
        const lastMedia = db
          .prepare('SELECT MAX(ordem) as max_ordem FROM midias WHERE playlist_id = ?')
          .get(media.playlist_id) as { max_ordem: number | null }
        order = lastMedia.max_ordem !== null ? lastMedia.max_ordem + 1 : 0
      }
      const result = db
        .prepare(
          `
        INSERT INTO midias (playlist_id, nome, tipo, caminho_arquivo, duracao, ordem)
        VALUES (?, ?, ?, ?, ?, ?)
      `
        )
        .run(media.playlist_id, media.nome, media.tipo, media.caminho_arquivo, media.duracao, order)
      return result.lastInsertRowid
    }
  })

  ipcMain.handle('db:delete-media', (_, id: number) => {
    db.prepare('DELETE FROM midias WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:update-media-order', (_, playlistId: number, mediaIds: number[]) => {
    const updateStmt = db.prepare('UPDATE midias SET ordem = ? WHERE id = ? AND playlist_id = ?')
    const transaction = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => {
        updateStmt.run(index, id, playlistId)
      })
    })
    transaction(mediaIds)
    return true
  })

  // Configurações
  ipcMain.handle('db:get-config', () => {
    return db.prepare('SELECT * FROM configuracoes WHERE id = 1').get()
  })

  ipcMain.handle('db:save-config', (_, config: Partial<Config>) => {
    const fields = Object.keys(config) as Array<keyof Config>
    if (fields.length === 0) return true

    const setClause = fields.map((field) => `${field} = ?`).join(', ')
    const values = fields.map((field) => config[field])

    db.prepare(
      `
      UPDATE configuracoes 
      SET ${setClause}
      WHERE id = 1
    `
    ).run(...values)
    return true
  })

  // Settings
  ipcMain.handle('db:get-settings', () => {
    return db.prepare('SELECT * FROM settings WHERE id = 1').get()
  })

  ipcMain.handle('db:save-settings', (_, settings: any) => {
    const fields = Object.keys(settings)
    if (fields.length === 0) return true

    const setClause = fields.map((field) => `${field} = ?`).join(', ')
    const values = fields.map((field) => settings[field])

    db.prepare(
      `
      UPDATE settings 
      SET ${setClause}
      WHERE id = 1
    `
    ).run(...values)
    return true
  })
}
