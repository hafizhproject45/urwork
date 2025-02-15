import PROJECTS from './model.js';
import ApiView from '../common/apiview.js';
import TASKS from '../Tasks/model.js';

export const ListProj = async (req, res) => {
	const filter =
		req.path == '/my'
			? {
					$or: [{ author: req.user._id }, { collaborators: { $in: [req.user._id] } }],
					is_blocked: false,
			  }
			: { is_blocked: false };
	const API = new ApiView(PROJECTS, filter, req.query, '-images');

	API.addPopulate('author', '_id first_name');
	API.addPopulate('collaborators', '_id first_name');

	const { status, msg, data } = await API.exec(
		API.list(req.query.search, ['title', 'tags'], req.query.start, req.query.end, req.query.page)
	);

	data.data = await Promise.all(
		data.data.map(async (dat) => {
			const obj = dat.toObject();
			const projectTasks = new ApiView(TASKS, { project_id: dat._id, completed_date: { $ne: null } }),
				completedTasks = await projectTasks.exec(projectTasks.count());

			projectTasks.filters = { project_id: dat._id, completed_date: null };
			const uncompletedTasks = await projectTasks.exec(projectTasks.count());

			if (uncompletedTasks.status == 200 && completedTasks.status == 200) {
				const totalTasks = completedTasks.data + uncompletedTasks.data;
				const percentage = (completedTasks.data / totalTasks) * 100;
				obj['percentage'] = percentage;
			}
			return obj;
		})
	);

	return res.status(status).json({ msg, ...data });
};

export const DetailProj = async (req, res) => {
	const API = new ApiView(PROJECTS, { _id: req.params.key, is_blocked: false });

	API.addPopulate('author', 'first_name last_name about photo');
	API.addPopulate('collaborators', 'first_name last_name about photo');

	const { status, msg, data } = await API.exec(API.detail());

	return res.status(status).json({ msg, data });
};

export const CreateProj = async (req, res) => {
	const payload = {
			...req.body,
			author: req.user._id,
			tags: req.body.tags.join(', '),
		},
		API = new ApiView(PROJECTS);

	const { status, msg, data } = await API.exec(API.create(payload));

	return res.status(status).json({ msg, data });
};

export const UpdateProj = async (req, res) => {
	const payload = {
			...req.body,
			tags: req.body.tags?.join(', '),
		},
		API = new ApiView(PROJECTS, { _id: req.params.key, is_blocked: false });

	const { status, msg, data } = await API.exec(API.update(payload));

	return res.status(status).json({ msg, data });
};

export const DeleteProj = async (req, res) => {
	const API = new ApiView(PROJECTS, { _id: req.params.key }),
		{ status, msg, data } = await API.exec(API.delete());

	return res.status(status).json({ msg });
};

export const StarringProj = async (req, res) => {
	const option =
			req.params.option == 'no' ? { $pull: { stars: req.user._id } } : { $addToSet: { stars: req.user._id } },
		API = new ApiView(PROJECTS, { _id: req.params.key }),
		{ status, msg, data } = await API.exec(API.update({ ...option }));

	return res.status(status).json({ msg });
};
