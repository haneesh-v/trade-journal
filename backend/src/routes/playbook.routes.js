const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

// Get all playbooks for user
router.get('/', authenticate, async (req, res) => {
    try {
        const playbooks = await db.query(`
            SELECT p.*, 
                   COUNT(DISTINCT pr.id) as rule_count,
                   COUNT(DISTINCT tp.trade_id) as trade_count
            FROM playbooks p
            LEFT JOIN playbook_rules pr ON p.id = pr.playbook_id
            LEFT JOIN trade_playbooks tp ON p.id = tp.playbook_id
            WHERE p.user_id = $1
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, [req.user.id]);
        
        res.json(playbooks.rows);
    } catch (error) {
        console.error('Error fetching playbooks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single playbook with rules
router.get('/:id', authenticate, async (req, res) => {
    try {
        const playbook = await db.query(`
            SELECT * FROM playbooks 
            WHERE id = $1 AND user_id = $2
        `, [req.params.id, req.user.id]);
        
        if (playbook.rows.length === 0) {
            return res.status(404).json({ error: 'Playbook not found' });
        }
        
        const rules = await db.query(`
            SELECT * FROM playbook_rules 
            WHERE playbook_id = $1 
            ORDER BY rule_type, order_index
        `, [req.params.id]);
        
        res.json({
            ...playbook.rows[0],
            entry_rules: rules.rows.filter(r => r.rule_type === 'entry'),
            exit_rules: rules.rows.filter(r => r.rule_type === 'exit')
        });
    } catch (error) {
        console.error('Error fetching playbook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create playbook
router.post('/', authenticate, async (req, res) => {
    const { name, description, color, entry_rules, exit_rules } = req.body;
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Create playbook
        const playbook = await client.query(`
            INSERT INTO playbooks (user_id, name, description, color)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [req.user.id, name, description, color || '#3B82F6']);
        
        const playbookId = playbook.rows[0].id;
        
        // Add entry rules
        if (entry_rules && entry_rules.length > 0) {
            for (let i = 0; i < entry_rules.length; i++) {
                await client.query(`
                    INSERT INTO playbook_rules (playbook_id, rule_text, rule_type, order_index)
                    VALUES ($1, $2, 'entry', $3)
                `, [playbookId, entry_rules[i], i]);
            }
        }
        
        // Add exit rules
        if (exit_rules && exit_rules.length > 0) {
            for (let i = 0; i < exit_rules.length; i++) {
                await client.query(`
                    INSERT INTO playbook_rules (playbook_id, rule_text, rule_type, order_index)
                    VALUES ($1, $2, 'exit', $3)
                `, [playbookId, exit_rules[i], i]);
            }
        }
        
        await client.query('COMMIT');
        res.status(201).json(playbook.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating playbook:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update playbook
router.put('/:id', authenticate, async (req, res) => {
    const { name, description, color, entry_rules, exit_rules } = req.body;
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Verify ownership
        const existing = await client.query(
            'SELECT id FROM playbooks WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        
        if (existing.rows.length === 0) {
            throw new Error('Playbook not found');
        }
        
        // Update playbook
        const playbook = await client.query(`
            UPDATE playbooks 
            SET name = $1, description = $2, color = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND user_id = $5
            RETURNING *
        `, [name, description, color, req.params.id, req.user.id]);
        
        // Delete existing rules
        await client.query('DELETE FROM playbook_rules WHERE playbook_id = $1', [req.params.id]);
        
        // Add new entry rules
        if (entry_rules && entry_rules.length > 0) {
            for (let i = 0; i < entry_rules.length; i++) {
                await client.query(`
                    INSERT INTO playbook_rules (playbook_id, rule_text, rule_type, order_index)
                    VALUES ($1, $2, 'entry', $3)
                `, [req.params.id, entry_rules[i], i]);
            }
        }
        
        // Add new exit rules
        if (exit_rules && exit_rules.length > 0) {
            for (let i = 0; i < exit_rules.length; i++) {
                await client.query(`
                    INSERT INTO playbook_rules (playbook_id, rule_text, rule_type, order_index)
                    VALUES ($1, $2, 'exit', $3)
                `, [req.params.id, exit_rules[i], i]);
            }
        }
        
        await client.query('COMMIT');
        res.json(playbook.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating playbook:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Delete playbook
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM playbooks WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Playbook not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting playbook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Assign playbook to trade with rule adherence
router.post('/assign', authenticate, async (req, res) => {
    const { trade_id, playbook_id, rule_adherence } = req.body;
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Verify trade ownership
        const trade = await client.query(
            'SELECT id FROM trades WHERE id = $1 AND user_id = $2',
            [trade_id, req.user.id]
        );
        
        if (trade.rows.length === 0) {
            throw new Error('Trade not found');
        }
        
        // Assign playbook to trade
        await client.query(`
            INSERT INTO trade_playbooks (trade_id, playbook_id)
            VALUES ($1, $2)
            ON CONFLICT (trade_id, playbook_id) DO NOTHING
        `, [trade_id, playbook_id]);
        
        // Record rule adherence
        if (rule_adherence && rule_adherence.length > 0) {
            for (const adherence of rule_adherence) {
                await client.query(`
                    INSERT INTO trade_rule_adherence 
                    (trade_id, playbook_rule_id, followed, notes)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (trade_id, playbook_rule_id) 
                    DO UPDATE SET followed = $3, notes = $4
                `, [trade_id, adherence.rule_id, adherence.followed, adherence.notes]);
            }
        }
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error assigning playbook:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Get playbook analytics
router.get('/:id/analytics', authenticate, async (req, res) => {
    try {
        const analytics = await db.query(`
            SELECT 
                pr.id as rule_id,
                pr.rule_text,
                pr.rule_type,
                COUNT(tra.id) as times_checked,
                SUM(CASE WHEN tra.followed THEN 1 ELSE 0 END) as times_followed,
                ROUND(
                    100.0 * SUM(CASE WHEN tra.followed THEN 1 ELSE 0 END) / 
                    NULLIF(COUNT(tra.id), 0), 
                    2
                ) as adherence_rate
            FROM playbook_rules pr
            LEFT JOIN trade_rule_adherence tra ON pr.id = tra.playbook_rule_id
            WHERE pr.playbook_id = $1
            GROUP BY pr.id, pr.rule_text, pr.rule_type
            ORDER BY pr.rule_type, pr.order_index
        `, [req.params.id]);
        
        res.json(analytics.rows);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
